# arq_worker.py
import logging
import os
from datetime import datetime
from typing import Optional
from arq.connections import RedisSettings
from config import is_ready, supabase
from core.ai_analysis import get_gemini_analysis
from core.database import batch_save_jobs
from core.scraping import run_job_scrape

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

async def startup(ctx):
    log.info("Arq worker is starting up...")

async def shutdown(ctx):
    log.info("Arq worker is shutting down...")

# --- JOB 1: THE SCRAPER (UPDATED) ---
async def scrape_and_save(ctx, search_config: dict, user_id: str, search_id: str):
    log.info(f"--- WORKER RECEIVED JOB: scrape_and_save (User: {user_id}, Search: {search_id}) ---")
    
    scraped_jobs = run_job_scrape(
        search_term=search_config.get("search_term"),
        location=search_config.get("location"),
        hours_old=search_config.get("hours_old", 24)
    )
    
    if not scraped_jobs:
        log.info("Scraping finished. No jobs found.")
        return {"status": "ok", "jobs_found": 0, "newly_saved": 0}

    log.info(f"Found {len(scraped_jobs)} jobs. Handing off to batch saver...")
    
    for job in scraped_jobs:
        job['created_at'] = datetime.now().isoformat()
    
    try:
        saved_count = batch_save_jobs(scraped_jobs, user_id, search_id)
    except Exception as e:
        log.error(f"Failed to batch save jobs: {e}")
        raise e 
            
    log.info(f"--- WORKER FINISHED JOB: scrape_and_save ---")
    return {"status": "ok", "jobs_found": len(scraped_jobs), "newly_saved": saved_count}


# --- JOB 2: ON-DEMAND AI ANALYST (No changes) ---
async def analyze_job_on_demand(ctx, job_id: int, profile_id: str, description: Optional[str] = None):
    log.info(f"--- WORKER RECEIVED JOB: analyze_job_on_demand (Job ID: {job_id}, Profile ID: {profile_id}) ---")
    
    if not is_ready():
        raise Exception("Worker not configured (Supabase/Gemini keys missing)")

    job_description = description 

    try:
        if not job_description:
            log.info(f"No description provided, fetching job {job_id} from DB...")
            job_res = supabase.table("jobs").select("id, description").eq("id", job_id).single().execute()
            job = job_res.data
            if not job: raise Exception(f"Job {job_id} not found.")
            if not job.get("description"): raise Exception(f"Job {job_id} has no description in DB.")
            job_description = job.get("description")
        else:
            log.info(f"Using provided description for job {job_id}.")

        log.info(f"Fetching profile {profile_id}...")
        profile_res = supabase.table("profiles").select("resume_context, experience_level").eq("id", profile_id).single().execute()
        profile = profile_res.data
        if not profile: raise Exception(f"Profile {profile_id} not found.")

        ai_result = get_gemini_analysis(
            resume_context=profile.get("resume_context"),
            job_description=job_description,
            experience_level=profile.get("experience_level", "entry_level")
        )
        
        if not ai_result:
            raise Exception("AI analysis failed to return valid data.")

        update_data = {
            "gemini_rating": ai_result.get("gemini_rating"),
            "ai_reason": ai_result.get("ai_reason"),
            "profile_id": profile_id,
            "description": job_description 
        }
        
        log.info(f"Updating job {job_id} with AI rating: {ai_result.get('gemini_rating')}/10")
        supabase.table("jobs").update(update_data).eq("id", job_id).execute()
        
        log.info(f"--- WORKER FINISHED JOB: analyze_job_on_demand (Job ID: {job_id}) ---")
        return {"status": "ok", "job_id": job_id, "rating": update_data["gemini_rating"]}

    except Exception as e:
        log.error(f"Failed to process job {job_id}: {e}")
        raise e

# --- WORKER SETTINGS (THIS IS THE IMPORTANT CHANGE) ---
class WorkerSettings:
    functions = [
        scrape_and_save,
        analyze_job_on_demand,
    ] 
    on_startup = startup
    on_shutdown = shutdown
    # --- THIS IS THE FIX ---
    redis_settings = RedisSettings.from_dsn(os.getenv('REDIS_URL', 'redis://127.0.0.1:6379'))
    # --- END OF FIX ---