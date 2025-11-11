# main.py
import asyncio
import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, status
from arq import create_pool
from arq.worker import Worker
from arq.connections import RedisSettings
from pydantic import BaseModel, HttpUrl
from typing import List, Optional
from datetime import datetime

# --- Local Imports ---
from config import is_ready, supabase
from core.ai_analysis import (
    get_interview_prep, 
    get_resume_suggestions, 
    get_cover_letter,
    get_gemini_analysis 
)
from core.auth import get_current_user
from core.ai_crew import run_resume_crew
from arq_worker import WorkerSettings

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# --- Lifespan Manager (THIS IS THE FIX) ---
worker_task = None
ARQ_REDIS = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global ARQ_REDIS, worker_task
    
    # 1. Connect to Redis
    redis_url = os.getenv('REDIS_URL', 'redis://127.0.0.1:6379')
    log.info(f"Connecting to Redis at {redis_url}...")
    try:
        ARQ_REDIS = await create_pool(RedisSettings.from_dsn(redis_url))
        log.info("Successfully connected to Redis.")
    except Exception as e:
        log.error(f"Failed to connect to Redis: {e}")
        raise e
        
    # 2. Create the Worker instance
    worker = Worker(
        functions=WorkerSettings.functions, 
        redis_pool=ARQ_REDIS,
        on_startup=WorkerSettings.on_startup,
        on_shutdown=WorkerSettings.on_shutdown
    )

    # 3. Start the worker in the background using worker.main()
    log.info("Starting background Arq worker...")
    worker_task = asyncio.create_task(worker.main())
    
    yield
    
    # 4. Cleanup on shutdown
    log.info("Shutting down worker...")
    if worker_task:
        await worker.close()
        await worker_task
    
    log.info("Closing Redis connection...")
    if ARQ_REDIS:
        await ARQ_REDIS.close()
    log.info("Shutdown complete.")

# --- Create the FastAPI App ---
app = FastAPI(
    title="IntelliApply API",
    description="The new unified backend for IntelliApply 2.0",
    version="2.0.0",
    lifespan=lifespan
)

# --- CORS MIDDLEWARE ---
from fastapi.middleware.cors import CORSMiddleware
# --- THIS IS THE FINAL CHANGE ---
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://ai-job-scraper-zeta.vercel.app" # <-- ADD YOUR LIVE VERCEL URL HERE
]
# --- END OF CHANGE ---

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)
# --- END CORS MIDDLEWARE ---


@app.get("/")
async def get_root():
    return {"status": "ok", "message": "IntelliApply API v2.0 is running."}

# --- Pydantic Models ---
class ScrapeRequest(BaseModel):
    search_term: str
    location: str
    hours_old: int = 24
    search_id: str 

class AnalyzeRequest(BaseModel):
    profile_id: str
    description: Optional[str] = None

class BulkAnalyzeRequest(BaseModel):
    profile_id: str
    job_ids: List[int]

class ManualJobCreate(BaseModel):
    title: str
    company: str
    job_url: str
    location: Optional[str] = None
    description: Optional[str] = None
    
class OptimizedResumeRequest(BaseModel):
    profile_id: str
    job_id: int

class AIRequest(BaseModel):
    job_description: str
    profile_id: str
    company: str | None = None
    title: str | None = None

class JobStatusUpdate(BaseModel):
    status: str

class JobDetailsUpdate(BaseModel):
    notes: Optional[str] = None
    contacts: Optional[list] = None
    is_tracked: Optional[bool] = None
    status: Optional[str] = None
    description: Optional[str] = None

class JobDeleteRequest(BaseModel):
    job_ids: List[int]

# --- Re-usable function to get profile context ---
def get_profile_context(profile_id: str, user_id: str):
    if not is_ready():
        raise HTTPException(status_code=503, detail="DB client not configured.")
    try:
        profile_res = supabase.table("profiles") \
            .select("resume_context, experience_level") \
            .eq("id", profile_id) \
            .eq("user_id", user_id) \
            .single().execute()
            
        profile = profile_res.data
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found or access denied.")
        return profile
    except Exception as e:
        log.error(f"Failed to fetch profile {profile_id}: {e}")
        raise HTTPException(status_code=500, detail="Database error.")

# --- API Endpoints ---

@app.post("/api/v1/searches/trigger-scrape")
async def trigger_scrape(request: ScrapeRequest, user_id: str = Depends(get_current_user)):
    if not ARQ_REDIS:
        raise HTTPException(status_code=503, detail="Job queue (Redis) is not connected.")
    log.info(f"API: Received scrape request for: '{request.search_term}' from User {user_id}")
    
    await ARQ_REDIS.enqueue_job(
        "scrape_and_save", 
        request.model_dump(), 
        user_id, 
        request.search_id
    )
    return {"status": "ok", "message": "Scrape-and-save job enqueued."}


@app.post("/api/v1/jobs/{job_id}/analyze")
async def trigger_on_demand_analysis(job_id: int, request: AnalyzeRequest, user_id: str = Depends(get_current_user)):
    if not ARQ_REDIS:
        raise HTTPException(status_code=503, detail="Job queue (Redis) is not connected.")
    
    job_res = supabase.table("jobs").select("id").eq("id", job_id).eq("user_id", user_id).single().execute()
    if not job_res.data:
        raise HTTPException(status_code=404, detail="Job not found or access denied.")
        
    log.info(f"API: Received on-demand analysis for job {job_id} using profile {request.profile_id} (User: {user_id})")
    
    await ARQ_REDIS.enqueue_job(
        "analyze_job_on_demand", 
        job_id, 
        request.profile_id, 
        request.description
    )
    return {"status": "ok", "message": "On-demand analysis enqueued."}

@app.post("/api/v1/jobs/bulk-analyze")
async def trigger_bulk_analysis(request: BulkAnalyzeRequest, user_id: str = Depends(get_current_user)):
    if not ARQ_REDIS:
        raise HTTPException(status_code=503, detail="Job queue (Redis) is not connected.")

    log.info(f"API: Received bulk analysis request for {len(request.job_ids)} jobs from User {user_id}")

    get_profile_context(request.profile_id, user_id)

    response = supabase.table("jobs") \
        .select("id, description") \
        .in_("id", request.job_ids) \
        .eq("user_id", user_id) \
        .not_.is_("description", None) \
        .is_("gemini_rating", None) \
        .execute()

    if hasattr(response, 'error') and response.error:
        raise Exception(str(response.error))

    jobs_to_process = response.data
    if not jobs_to_process:
        return {"status": "ok", "message": "No new jobs with descriptions to analyze."}

    enqueued_count = 0
    for job in jobs_to_process:
        await ARQ_REDIS.enqueue_job(
            "analyze_job_on_demand",
            job['id'],
            request.profile_id,
            job['description']
        )
        enqueued_count += 1
    
    log.info(f"API: Enqueued {enqueued_count} analysis jobs.")
    return {"status": "ok", "message": f"Enqueued {enqueued_count} jobs for analysis."}

@app.post("/api/v1/jobs/create-manual", status_code=status.HTTP_201_CREATED)
async def create_manual_job(request: ManualJobCreate, user_id: str = Depends(get_current_user)):
    try:
        dupe_check = supabase.table("jobs").select("id", count='exact') \
            .eq("user_id", user_id) \
            .ilike("title", request.title) \
            .ilike("company", request.company) \
            .execute()

        if dupe_check.count > 0:
            raise HTTPException(status_code=409, detail="This job already exists in your library.")

        job_to_save = {
            "user_id": user_id,
            "title": request.title,
            "company": request.company,
            "job_url": request.job_url,
            "location": request.location,
            "description": request.description,
            "created_at": datetime.now().isoformat(),
            "status": "Applied",
            "is_tracked": False,
        }
        
        insert_response = supabase.table("jobs").insert(job_to_save).execute()
        
        if hasattr(insert_response, 'error') and insert_response.error:
            raise Exception(str(insert_response.error))
            
        if not insert_response.data:
            raise Exception("Failed to save job, no data returned.")
            
        log.info(f"API: Manually created job {insert_response.data[0]['id']} for user {user_id}")
        return insert_response.data[0]
        
    except HTTPException as he:
        raise he
    except Exception as e:
        log.error(f"Failed to create manual job: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/ai/interview-prep")
async def generate_interview_prep(request: AIRequest, user_id: str = Depends(get_current_user)):
    log.info(f"API: Received interview prep request for profile {request.profile_id}...")
    profile = get_profile_context(request.profile_id, user_id)
    prep_data = get_interview_prep(profile.get("resume_context"), request.job_description)
    if not prep_data:
        raise HTTPException(status_code=500, detail="AI failed to generate prep data.")
    return prep_data

@app.post("/api/v1/ai/tailor-resume")
async def generate_resume_suggestions(request: AIRequest, user_id: str = Depends(get_current_user)):
    log.info(f"API: Received resume tailoring request for profile {request.profile_id}...")
    profile = get_profile_context(request.profile_id, user_id)
    suggestions = get_resume_suggestions(profile.get("resume_context"), request.job_description)
    if not suggestions:
        raise HTTPException(status_code=500, detail="AI failed to generate suggestions.")
    return suggestions

@app.post("/api/v1/ai/generate-cover-letter")
async def generate_cover_letter(request: AIRequest, user_id: str = Depends(get_current_user)):
    log.info(f"API: Received cover letter request for profile {request.profile_id}...")
    if not request.company or not request.title:
        raise HTTPException(status_code=400, detail="Company and Title are required for cover letters.")
    profile = get_profile_context(request.profile_id, user_id)
    letter = get_cover_letter(profile.get("resume_context"), request.job_description, request.company, request.title)
    if not letter:
        raise HTTPException(status_code=500, detail="AI failed to generate cover letter.")
    return letter

# --- Optimized Resume Endpoint ---
@app.post("/api/v1/ai/generate-optimized-resume")
async def generate_optimized_resume(request: OptimizedResumeRequest, user_id: str = Depends(get_current_user)):
    log.info(f"API: Received resume optimization request for job {request.job_id} from user {user_id}")
    try:
        # 1. Get Profile Context (verifies user)
        profile = get_profile_context(request.profile_id, user_id)
        resume_context = profile.get("resume_context")

        # 2. Get Job Description (verifies user)
        job_res = supabase.table("jobs") \
            .select("description") \
            .eq("id", request.job_id) \
            .eq("user_id", user_id) \
            .single() \
            .execute()
        
        if hasattr(job_res, 'error') and job_res.error:
            raise Exception(str(job_res.error))
        if not job_res.data or not job_res.data.get("description"):
            raise HTTPException(status_code=404, detail="Job description not found for this job.")
        
        job_description = job_res.data["description"]
        
        # 3. Run the CrewAI task
        log.info("Handing off to AI Crew...")
        
        optimized_resume = await asyncio.to_thread(
            run_resume_crew, 
            job_description=job_description, 
            resume_context=resume_context
        )
        log.info("AI Crew finished. Returning result.")
        
        if optimized_resume.startswith("Error:"):
            raise Exception(optimized_resume)
            
        return {"optimized_resume": optimized_resume}
        
    except HTTPException as he:
        log.error(f"HTTP exception: {he.detail}")
        raise he
    except Exception as e:
        log.error(f"Failed to generate optimized resume: {e}")
        raise HTTPException(status_code=500, detail=str(e))
# --- END NEW ENDPOINT ---

# --- JOB MUTATION ENDPOINTS ---

@app.post("/api/v1/jobs/{job_id}/update-status")
async def update_job_status(job_id: int, request: JobStatusUpdate, user_id: str = Depends(get_current_user)):
    try:
        response = supabase.table("jobs") \
            .update({"status": request.status}) \
            .eq("id", job_id) \
            .eq("user_id", user_id) \
            .execute()
        if hasattr(response, 'error') and response.error:
            raise Exception(str(response.error))
            
        return {"status": "ok", "message": "Job status updated."}
    except Exception as e:
        log.error(f"Failed to update job status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/jobs/{job_id}/update-details")
async def update_job_details(job_id: int, request: JobDetailsUpdate, user_id: str = Depends(get_current_user)):
    try:
        update_data = request.model_dump(exclude_unset=True) 
        if not update_data:
             raise HTTPException(status_code=400, detail="No data provided.")
             
        response = supabase.table("jobs") \
            .update(update_data) \
            .eq("id", job_id) \
            .eq("user_id", user_id) \
            .execute()
        if hasattr(response, 'error') and response.error:
            raise Exception(str(response.error))

        return {"status": "ok", "message": "Job details updated."}
    except Exception as e:
        log.error(f"Failed to update job details: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/jobs/delete")
async def delete_jobs(request: JobDeleteRequest, user_id: str = Depends(get_current_user)):
    try:
        job_ids = request.job_ids
        if not job_ids:
             raise HTTPException(status_code=400, detail="No job IDs provided.")

        response = supabase.table("jobs") \
            .delete() \
            .in_("id", job_ids) \
            .eq("user_id", user_id) \
            .execute()
            
        if hasattr(response, 'error') and response.error:
            raise Exception(str(response.error))
            
        return {"status": "ok", "message": f"Deleted {len(response.data)} job(s)."}
    except Exception as e:
        log.error(f"Failed to delete jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/vD/jobs/delete-all-untracked")
async def delete_all_untracked_jobs(user_id: str = Depends(get_current_user)):
    try:
        response = supabase.table("jobs") \
            .delete() \
            .eq("user_id", user_id) \
            .eq("is_tracked", False) \
            .execute()
            
        if hasattr(response, 'error') and response.error:
            raise Exception(str(response.error))
            
        return {"status": "ok", "message": f"Deleted {len(response.data)} untracked job(s)."}
    except Exception as e:
        log.error(f"Failed to delete untracked jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)