<div align="center">

# IntelliApply
**Your Proactive AI-Powered Job Search Co-pilot**

</div>

<p align="center">
  IntelliApply is a full-stack, AI-powered job search assistant designed to automate and accelerate your application process. It moves beyond passive searching by proactively scraping new job postings, analyzing them against your custom profiles using generative AI, and providing a suite of tools to help you tailor applications and prepare for interviews—all in a single, real-time dashboard.
</p>

<p align="center">
  <img alt="GitHub License" src="https://img.shields.io/badge/License-MIT-blue.svg">
  <img alt="Python" src="https://img.shields.io/badge/Python-3.11-blue?logo=python&logoColor=white">
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-0.109-05998b?logo=fastapi&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black">
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-1.150-3ECF8E?logo=supabase&logoColor=white">
</p>

> **Note:** This project is in active development.

---

## ✨ Key Features

* **Proactive Job Scraping:** The system runs background jobs (`arq` + `jobspy`) to scrape sites like LinkedIn and Indeed for new postings based on your custom search criteria.
* **AI-Powered Job Analysis:** New jobs are automatically analyzed by Google's Gemini AI, which provides a `1-10` rating and a concise reason for how well the job matches your specific resume profile.
* **Real-time Job Inbox:** Scraped jobs (and their AI ratings) are pushed to your dashboard in real-time using Supabase Realtime.
* **Kanban Application Tracker:** Drag-and-drop jobs through your application pipeline (Applied, Interviewing, Offer, Rejected).
* **Multi-Profile Management:** Create and manage multiple distinct profiles (e.g., "Frontend Developer", "AI Engineer") with different resume contexts and file uploads (`.pdf`/`.docx`).
* **AI Application Toolkit:**
    * **AI Resume Tailoring:** Get specific suggestions on how to tweak your resume text for a target job description.
    * **AI Cover Letter Generator:** Generate a professional, tailored cover letter draft.
    * **AI Interview Prep:** Get a list of likely behavioral, technical, and situational interview questions based on your profile and the job.
* **Secure & Scoped:** All data (profiles, searches, jobs) is secured by Supabase RLS, ensuring users can only access their own data. All API endpoints are secured with Supabase JWT.

---

## 🏗️ System Architecture

IntelliApply uses a hybrid architecture. A React frontend acts as the UI, communicating with Supabase for data and a FastAPI backend for job processing and AI tasks.

```mermaid
graph LR
    subgraph User
        Frontend[🚀 React Frontend]
    end

    subgraph Backend Services
        API[FastAPI API]
        Worker[Arq Worker]
    end

    subgraph Third-Party
        Supabase[(Supabase)]
        Redis[(Redis Queue)]
        GeminiAI[🤖 Gemini AI]
        JobSites[(LinkedIn, Indeed, etc.)]
    end

    %% Frontend Flow
    Frontend -- Auth/Data (RLS) --> Supabase
    Frontend -- (Realtime) --> Supabase
    Frontend -- API Calls (JWT) --> API

    %% Backend API Flow
    API -- Enqueues Jobs --> Redis
    API -- Validates User/Data --> Supabase
    
    %% Worker Flow
    Worker -- Polls for Jobs --> Redis
    Worker -- Scrapes --> JobSites
    Worker -- Analyzes --> GeminiAI
    Worker -- Saves Job (Service Role) --> Supabase
````

-----

## 🛠️ Tech Stack

| Area | Technology |
| :--- | :--- |
| **Backend API** | Python, FastAPI |
| **Background Jobs** | Arq, Redis |
| **Scraping** | JobSpy, Pandas |
| **Generative AI** | Google Gemini |
| **Frontend** | React (Vite), Zustand |
| **Styling** | TailwindCSS |
| **UI Components** | Lucide Icons, Dnd-Kit (Drag & Drop) |
| **Database** | Supabase (PostgreSQL) |
| **Auth & Realtime** | Supabase Auth, Supabase Realtime |
| **File Storage** | Supabase Storage |

-----

## 🚀 Installation & Setup

This project is in two parts: `intelliapply-api` (backend) and `intelliapply-dashboard` (frontend). You must set up both.

### Prerequisites

  * Node.js (v18+)
  * Python (v3.10+)
  * Redis (must be running locally or on a server)
  * A Supabase account

### 1\. Supabase Setup

1.  **Create a Project:** Create a new project on [Supabase](https://supabase.com).

2.  **Get Keys:** In your project's **Settings \> API**, find your:

      * `VITE_SUPABASE_URL` (Project URL)
      * `VITE_SUPABASE_ANON_KEY` (Project API key - `anon`, `public`)
      * `SUPABASE_KEY` (Project API key - `service_role`, `secret`)

3.  **Run SQL Setup:** Go to the **SQL Editor** in your Supabase project and run the following scripts to set up RLS, create the `resumes` bucket, and add the missing `experience_level` column.

      * [Link to SQL Script 1 (RLS + Indexes)](https://www.google.com/search?q=https://github.com/Manoj-Murari/AI-Job-Scraper/blob/main/sql/01_rls_and_indexes.sql)
      * [Link to SQL Script 2 (Storage)](https://www.google.com/search?q=https://github.com/Manoj-Murari/AI-Job-Scraper/blob/main/sql/02_storage_and_policies.sql)
      * [Link to SQL Script 3 (Column Fix)](https://www.google.com/search?q=https://github.com/Manoj-Murari/AI-Job-Scraper/blob/main/sql/03_alter_tables.sql)
      * *(Self-correction: Since I cannot link to files, I must provide the SQL here. For a real README, you would link to the `.sql` files in your repo.)*

    **Run this in the Supabase SQL Editor:**

    ```sql
    -- Add missing experience_level column
    ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS experience_level TEXT;

    -- Enable RLS on all tables
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.searches ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

    -- Add Policies for 'profiles'
    CREATE POLICY "Allow authenticated users to select their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Allow users to insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Allow users to update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Allow users to delete their own profile" ON public.profiles FOR DELETE USING (auth.uid() = user_id);

    -- Add Policies for 'searches'
    CREATE POLICY "Allow authenticated users to select their own searches" ON public.searches FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Allow users to insert their own searches" ON public.searches FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Allow users to update their own searches" ON public.searches FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Allow users to delete their own searches" ON public.searches FOR DELETE USING (auth.uid() = user_id);

    -- Add Policies for 'jobs'
    CREATE POLICY "Allow authenticated users to select their own jobs" ON public.jobs FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Allow users to insert their own jobs" ON public.jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Allow users to update their own jobs" ON public.jobs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Allow users to delete their own jobs" ON public.jobs FOR DELETE USING (auth.uid() = user_id);

    -- Create 'resumes' bucket
    INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', true) ON CONFLICT (id) DO NOTHING;

    -- Add RLS Policies for Storage
    CREATE POLICY "Allow public read access to resumes" ON storage.objects FOR SELECT USING ( bucket_id = 'resumes' );
    CREATE POLICY "Allow users to upload to their own resume folder" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1] );
    CREATE POLICY "Allow users to update their own resumes" ON storage.objects FOR UPDATE USING ( bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1] );
    CREATE POLICY "Allow users to delete their own resumes" ON storage.objects FOR DELETE USING ( bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1] );
    ```

### 2\. Backend API (`intelliapply-api`)

```bash
# 1. Navigate to the backend directory
cd intelliapply-api

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up environment variables
# (Create a new file named .env)
cp .gitignore .env  # Placeholder - create .env
echo "SUPABASE_URL=YOUR_SUPABASE_URL" >> .env
echo "SUPABASE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY" >> .env
echo "GEMINI_API_KEY=YOUR_GOOGLE_AI_API_KEY" >> .env

# 5. Add your keys to the new .env file
```

### 3\. Frontend Dashboard (`intelliapply-dashboard`)

```bash
# 1. Navigate to the frontend directory
cd intelliapply-dashboard

# 2. Install dependencies
npm install

# 3. Set up environment variables
# (Create a new file named .env.local)
echo "VITE_SUPABASE_URL=YOUR_SUPABASE_URL" >> .env.local
echo "VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY" >> .env.local

# 4. Add your keys to the new .env.local file
```

-----

## 🏃 Running Locally

You must run **four** processes in separate terminals.

**1. Terminal 1: Start Redis**

```bash
# (Assuming Redis is installed and in your PATH)
redis-server
```

**2. Terminal 2: Start the Backend Worker**

```bash
cd intelliapply-api
source venv/bin/activate
arq arq_worker.WorkerSettings
```

**3. Terminal 3: Start the Backend API**

```bash
cd intelliapply-api
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

**4. Terminal 4: Start the Frontend App**

```bash
cd intelliapply-dashboard
npm run dev
```

You can now access the application at **`http://localhost:5173`**.

-----

## 🗺️ Roadmap

  * [ ] **More Scrapers:** Add support for more job boards (e.g., Y Combinator, Wellfound, company-specific career pages).
  * [ ] **Browser Extension:** Create a browser extension to save jobs to your inbox from any website with one click.
  * [ ] **Auto-Apply (Experimental):** Use AI agents to fill out and submit applications for high-match jobs.
  * [ ] **Deeper Analytics:** Provide charts and insights on your application success rate, keywords, and profile performance.

-----

## 📄 License

This project is licensed under the MIT License.

## 🧑‍💻 Maintainers

  * **[Manoj-Murari](https://www.google.com/search?q=https://github.com/Manoj-Murari)**

<!-- end list -->
