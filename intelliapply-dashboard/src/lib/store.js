// src/lib/store.js
import { create } from 'zustand';
import { supabase } from './supabaseClient';

// --- THIS IS THE CHANGE ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// --- Auth Helper (NOW ASYNC) ---
const getAuthHeaders = async () => {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    console.error('Error getting session for API request:', error);
    return { 'Content-Type': 'application/json' };
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.session.access_token}`,
  };
};

// --- Helper to parse API errors ---
const getErrorMessage = async (response) => {
    try {
        const data = await response.json();
        if (data.detail) {
            try {
                const errorObj = JSON.parse(data.detail);
                return errorObj.message || data.detail;
            } catch (e) {
                return data.detail; // It's just a string
            }
        }
    } catch (e) {
        // Fallback
    }
    return response.statusText || 'An unknown error occurred.';
}


export const useStore = create((set, get) => ({
  // --- STATE ---
  view: 'inbox',
  allJobs: [],
  profiles: [],
  searches: [],
  selectedJob: null,
  loading: true,
  notifications: [],
  modalState: { isOpen: false, onConfirm: null, title: '', message: '' },
  isSearching: false,
  activeProfileId: null,

  // --- AI Modal State ---
  isTailorModalOpen: false,
  isCoverLetterModalOpen: false,
  isInterviewPrepModalOpen: false,
  isApplicationHelperOpen: false,
  isAddJobModalOpen: false,
  isOptimizedResumeModalOpen: false,

  // --- AI Generation State ---
  isGenerating: false,
  tailoringSuggestions: [],
  coverLetter: '',
  interviewPrepData: null,
  aiError: null,
  optimizedResume: '',

  channel: null,
  isWelcomeModalOpen: false,
  isSearchModalOpen: false,
  selectedJobIds: new Set(),

  // --- ACTIONS ---
  setView: (view) => set({ view }),
  setSelectedJob: (job) => set({ selectedJob: job }),
  setActiveProfileId: (profileId) => set({ activeProfileId: profileId }),

  // --- Modal Actions ---
  openTailorModal: () =>
    set({ isTailorModalOpen: true, tailoringSuggestions: [], aiError: null }),
  closeTailorModal: () => set({ isTailorModalOpen: false }),
  openCoverLetterModal: () =>
    set({ isCoverLetterModalOpen: true, coverLetter: '', aiError: null }),
  closeCoverLetterModal: () => set({ isCoverLetterModalOpen: false }),
  openInterviewPrepModal: () =>
    set({ isInterviewPrepModalOpen: true, interviewPrepData: null, aiError: null }),
  closeInterviewPrepModal: () => set({ isInterviewPrepModalOpen: false }),
  openApplicationHelper: () => set({ isApplicationHelperOpen: true }),
  closeApplicationHelper: () => set({ isApplicationHelperOpen: false }),
  openWelcomeModal: () => set({ isWelcomeModalOpen: true }),
  closeWelcomeModal: () => set({ isWelcomeModalOpen: false }),
  openSearchModal: () => set({ isSearchModalOpen: true }),
  closeSearchModal: () => set({ isSearchModalOpen: false }),
  openAddJobModal: () => set({ isAddJobModalOpen: true }),
  closeAddJobModal: () => set({ isAddJobModalOpen: false }),
  openOptimizedResumeModal: () =>
    set({ isOptimizedResumeModalOpen: true, optimizedResume: '', aiError: null }),
  closeOptimizedResumeModal: () => set({ isOptimizedResumeModalOpen: false }),

  // Notifications & Confirmation
  addNotification: (message, type = 'success') => {
    const id = Date.now();
    set((state) => ({
      notifications: [...state.notifications, { id, message, type }],
    }));
  },
  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },
  openConfirmationModal: (title, message, onConfirm) => {
    set({ modalState: { isOpen: true, title, message, onConfirm } });
  },
  closeConfirmationModal: () => {
    set({ modalState: { isOpen: false, onConfirm: null, title: '', message: '' } });
  },

  // --- Job Selection ---
  toggleJobSelection: (jobId) => {
    set((state) => {
      const newSelectedIds = new Set(state.selectedJobIds);
      if (newSelectedIds.has(jobId)) newSelectedIds.delete(jobId);
      else newSelectedIds.add(jobId);
      return { selectedJobIds: newSelectedIds };
    });
  },
  clearJobSelection: () => set({ selectedJobIds: new Set() }),

  // --- Data Fetching ---
  fetchAllData: async () => {
    set({ loading: true });
    try {
      await get().fetchProfiles();
      const profiles = get().profiles;
      
      if (profiles.length === 0) {
        set({ isWelcomeModalOpen: true });
      } else {
        if (!get().activeProfileId) {
          set({ activeProfileId: profiles[0].id });
        }
      }
      
      await Promise.all([get().fetchJobs(), get().fetchSearches()]);
    } catch (error) {
      get().addNotification(`Error fetching data: ${error.message}`, 'error');
    } finally {
      set({ loading: false });
    }
  },

  fetchJobs: async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    set({ allJobs: data || [] });
  },

  fetchProfiles: async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    set({ profiles: data || [] });
  },

  fetchSearches: async () => {
    const { data, error } = await supabase
      .from('searches')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    set({ searches: data || [] });
  },

  // --- Realtime ---
  subscribeToJobs: () => {
    if (get().channel) return;

    const mergeJobUpdate = (oldJob, newPayload) => ({ ...oldJob, ...newPayload });

    const channel = supabase
      .channel('public:jobs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        (payload) => {
          console.log('Realtime payload received:', payload);
          
          if (payload.eventType === 'INSERT') {
            set((state) => ({
              allJobs: [payload.new, ...state.allJobs],
              isSearching: false,
            }));
            if (payload.new.search_id) {
                get().addNotification(`New job found: ${payload.new.title}`, 'info');
            }
          }
          
          if (payload.eventType === 'UPDATE') {
             set((state) => ({
                allJobs: state.allJobs.map((job) =>
                  job.id === payload.new.id ? mergeJobUpdate(job, payload.new) : job
                ),
                selectedJob:
                  state.selectedJob?.id === payload.new.id
                    ? mergeJobUpdate(state.selectedJob, payload.new)
                    : state.selectedJob,
              }));
              if (payload.old.description === null && payload.new.description) {
                 get().addNotification(`Description saved for: ${payload.new.title}`, 'success');
              }
              if (payload.old.gemini_rating === null && payload.new.gemini_rating) {
                 get().addNotification(`AI Analysis complete for: ${payload.new.title}`, 'success');
              }
          }
          
          if (payload.eventType === 'DELETE') {
             set((state) => ({
                allJobs: state.allJobs.filter((job) => job.id !== payload.old.id),
                selectedJob:
                  state.selectedJob?.id === payload.old.id ? null : state.selectedJob,
                selectedJobIds: new Set(
                  [...state.selectedJobIds].filter((id) => id !== payload.old.id)
                ),
              }));
          }
        }
      )
      .subscribe();

    set({ channel });
  },

  unsubscribeFromJobs: () => {
    const channel = get().channel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ channel: null });
    }
  },

  // --- Backend API Actions ---
  handleTriggerJobSearch: async () => {
    if (get().isSearching) {
      get().addNotification('A search is already in progress.', 'info');
      return;
    }
    const searches = get().searches;
    if (!searches.length) {
      get().addNotification('No saved searches. Please add a search on the Settings page.', 'error');
      return;
    }
    set({ isSearching: true });
    get().addNotification(`Starting scrape for ${searches.length} saved search(es)...`, 'info');
    
    try {
      const authHeaders = await getAuthHeaders();
      for (const search of searches) {
        const response = await fetch(`${API_BASE_URL}/api/v1/searches/trigger-scrape`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            search_term: search.search_term,
            location: search.country,
            hours_old: search.hours_old,
            search_id: search.id,
          }),
        });
        if (!response.ok) throw new Error(await getErrorMessage(response));
      }
      
      setTimeout(() => {
        if (get().isSearching) {
          set({ isSearching: false });
          get().addNotification(
            'Scrape complete. New jobs (if any) are in your inbox.',
            'info'
          );
        }
      }, 30000);
      
    } catch (error) {
      get().addNotification(`Error triggering scrape: ${error.message}`, 'error');
      set({ isSearching: false });
    }
  },

  handleAnalyzeJob: async (jobId, profileId, description) => {
    if (!jobId || profileId === null || profileId === undefined) {
      get().addNotification('Could not start analysis: No profile selected.', 'error');
      return;
    }

    get().addNotification('Sending job to AI for analysis...', 'info');
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/jobs/${jobId}/analyze`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ 
          profile_id: profileId,
          description: description
        }),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
    } catch (error) {
      get().addNotification(`Error: ${error.message}`, 'error');
      throw error;
    }
  },
  
  handleBulkAnalyze: async (jobsToAnalyze) => {
    const activeProfileId = get().activeProfileId;
    if (!activeProfileId) {
      get().addNotification('Please select an active profile first.', 'error');
      return;
    }
    
    const jobIdsToAnalyze = jobsToAnalyze
      .filter(job => !job.gemini_rating && job.description)
      .map(job => job.id);
      
    if (jobIdsToAnalyze.length === 0) {
      get().addNotification('No new jobs with descriptions to analyze.', 'info');
      return;
    }
    
    get().addNotification(`Sending ${jobIdsToAnalyze.length} jobs for analysis...`, 'info');
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/jobs/bulk-analyze`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          profile_id: activeProfileId,
          job_ids: jobIdsToAnalyze
        })
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      
      const data = await response.json();
      get().addNotification(data.message, 'success');
      
    } catch (error) {
       get().addNotification(`Error starting bulk analysis: ${error.message}`, 'error');
    }
  },
  
  handleSaveManualJob: async (jobData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/jobs/create-manual`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify(jobData),
        });
        if (!response.ok) throw new Error(await getErrorMessage(response));
        
        get().addNotification('Job saved successfully!', 'success');
        get().closeAddJobModal();
        return true;
        
      } catch (error) {
        get().addNotification(`${error.message}`, 'error');
        return false;
      }
  },

  handleGetTailoring: async (jobDescription, profileId) => {
    set({ isGenerating: true, aiError: null, tailoringSuggestions: [] });
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/ai/tailor-resume`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          job_description: jobDescription,
          profile_id: profileId,
        }),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      const data = await response.json();
      set({ tailoringSuggestions: data.suggestions || [] });
    } catch (err) {
      set({ aiError: err.message });
    } finally {
      set({ isGenerating: false });
    }
  },

  handleGetCoverLetter: async (job, profileId, jobDescription) => {
    set({ isGenerating: true, aiError: null, coverLetter: '' });
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/ai/generate-cover-letter`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          job_description: jobDescription,
          profile_id: profileId,
          company: job.company,
          title: job.title,
        }),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      const data = await response.json();
      set({ coverLetter: data.coverLetter || '' });
    } catch (err) {
      set({ aiError: err.message });
    } finally {
      set({ isGenerating: false });
    }
  },

  generateInterviewPrep: async (job, profile, jobDescription) => {
    if (!job || !jobDescription) {
      get().addNotification('Job description is missing.', 'error');
      return;
    }
    if (!profile) {
      get().addNotification('No profile selected.', 'error');
      return;
    }
    
    set({ isGenerating: true, interviewPrepData: null, aiError: null });
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/ai/interview-prep`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          job_description: jobDescription,
          profile_id: profile.id,
        }),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      const data = await response.json();
      set({ interviewPrepData: data });
    } catch (err) {
      console.error('Error generating interview prep:', err);
      set({ aiError: err.message });
    } finally {
      set({ isGenerating: false });
    }
  },
  
  handleGenerateOptimizedResume: async (jobId, profileId) => {
    set({ isGenerating: true, aiError: null, optimizedResume: '' });
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/ai/generate-optimized-resume`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          job_id: jobId,
          profile_id: profileId,
        }),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      const data = await response.json();
      set({ optimizedResume: data.optimized_resume || '' });
    } catch (err) {
      set({ aiError: err.message });
    } finally {
      set({ isGenerating: false });
    }
  },

  // --- CRUD Operations ---
  handleSaveProfile: async (profile, file) => {
    set({ loading: true });
    let savedData = null;
    let user = null;
    
    try {
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !authUser) throw new Error(userError?.message || 'You must be logged in to save a profile.');
      user = authUser;

      const { id, ...profileData } = profile;
      const dataToSave = { ...profileData, user_id: user.id };

      let error;
      if (id) {
        const { data, error: updateError } = await supabase.from('profiles').update(dataToSave).eq('id', id).select().single();
        error = updateError;
        savedData = data;
      } else {
        const { data, error: insertError } = await supabase.from('profiles').insert([dataToSave]).select().single();
        error = insertError;
        savedData = data;
      }
      if (error) throw error;
      
      if (file) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/${savedData.id}/resume.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(filePath, file, { upsert: true });
          
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('resumes')
          .getPublicUrl(filePath);
          
        const { data: updatedProfile, error: urlSaveError } = await supabase
          .from('profiles')
          .update({ resume_file_url: urlData.publicUrl })
          .eq('id', savedData.id)
          .select()
          .single();
          
        if (urlSaveError) throw urlSaveError;
        savedData = updatedProfile;
      }

      get().addNotification('Profile saved!');
      
      if (id) {
           set((state) => ({
               profiles: state.profiles.map(p => p.id === savedData.id ? savedData : p),
               loading: false
           }));
      } else {
           set((state) => ({
               profiles: [savedData, ...state.profiles],
               loading: false
           }));
      }
      
      if (get().profiles.length === 1 && savedData) {
        set({ activeProfileId: savedData.id });
      }

    } catch (error) {
      get().addNotification(`Error saving profile: ${error.message}`, 'error');
      set({ loading: false });
    }
  },
  
  handleRemoveResume: async (profile) => {
    if (!profile?.resume_file_url) return;
    
    set({ loading: true });
    try {
      const url = new URL(profile.resume_file_url);
      const filePath = url.pathname.split('/resumes/')[1];

      if (!filePath) throw new Error("Could not parse file path from URL.");

      const { error: removeError } = await supabase.storage
        .from('resumes')
        .remove([filePath]);
        
      if (removeError) throw removeError;
      
      const { data: updatedProfile, error: dbError } = await supabase
        .from('profiles')
        .update({ resume_file_url: null })
        .eq('id', profile.id)
        .select()
        .single();
        
      if (dbError) throw dbError;

      get().addNotification('Resume file removed.');
      set((state) => ({
          profiles: state.profiles.map(p => p.id === updatedProfile.id ? updatedProfile : p),
          loading: false
      }));

    } catch (error) {
      get().addNotification(`Error removing resume: ${error.message}`, 'error');
      set({ loading: false });
    }
  },
  
  handleDeleteProfile: async (id) => {
    await supabase.from('profiles').delete().eq('id', id);
    get().addNotification('Profile deleted.');
    
    const remainingProfiles = get().profiles.filter((p) => p.id !== id);
    set({ profiles: remainingProfiles });
    
    if (get().activeProfileId === id) {
      set({ activeProfileId: remainingProfiles.length > 0 ? remainingProfiles[0].id : null });
    }
    
    get().closeConfirmationModal();
  },

  handleSaveSearch: async (search) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to save a search.');

      const { id, ...searchData } = search;
      const dataToSave = { ...searchData, user_id: user.id, profile_id: null }; 

      let error, savedData;
      if (id) {
        const { data, error: updateError } = await supabase.from('searches').update(dataToSave).eq('id', id).select().single();
        error = updateError;
        savedData = data;
      } else {
        const { data, error: insertError } = await supabase.from('searches').insert([dataToSave]).select().single();
        error = insertError;
        savedData = data;
      }
      if (error) throw error;
      
      get().addNotification('Search saved!');
      
      if (id) {
           set((state) => ({
               searches: state.searches.map(s => s.id === savedData.id ? savedData : s),
           }));
      } else {
           set((state) => ({
               searches: [savedData, ...state.searches],
           }));
      }
    } catch (error) {
      get().addNotification(`Error saving search: ${error.message}`, 'error');
    }
  },

  handleDeleteSearch: async (id) => {
    await supabase.from('searches').delete().eq('id', id);
    get().addNotification('Search deleted.');
    set((state) => ({ searches: state.searches.filter((s) => s.id !== id) }));
    get().closeConfirmationModal();
  },
  
  updateJobStatus: async (jobId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/jobs/${jobId}/update-status`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      get().addNotification('Job status updated!');
    } catch (error) {
      get().addNotification(`Error: ${error.message}`, 'error');
    }
  },

  updateJobDetails: async (jobId, updateData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/jobs/${jobId}/update-details`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(updateData),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
    } catch (error) {
      get().addNotification(`Error saving details: ${error.message}`, 'error');
    }
  },

  handleDeleteJob: async (jobId) => {
    if (!jobId) return;
    if (get().selectedJob?.id === jobId) set({ selectedJob: null });
    
    get().addNotification('Deleting job...', 'info');
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/jobs/delete`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ job_ids: [jobId] }),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      get().addNotification('Job successfully deleted.', 'success');
    } catch (error) {
      get().addNotification(`Error deleting job: ${error.message}`, 'error');
    } finally {
      get().closeConfirmationModal();
    }
  },

  handleDeleteAllJobs: async () => {
    get().addNotification('Deleting all non-tracked jobs...', 'info');
    get().closeConfirmationModal();
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/jobs/delete-all-untracked`, {
        method: 'POST',
        headers: await getAuthHeaders(),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      
      set({ selectedJob: null, selectedJobIds: new Set() });
      get().addNotification('All non-tracked jobs deleted.', 'success');
    } catch (error) {
      get().addNotification(`Error deleting jobs: ${error.message}`, 'error');
    }
  },

  handleDeleteSelectedJobs: async () => {
    const idsToDelete = Array.from(get().selectedJobIds);
    if (idsToDelete.length === 0) { 
      get().addNotification('No jobs selected.', 'warning');
      return;
    }
    
    get().addNotification(`Deleting ${idsToDelete.length} selected job(s)...`, 'info');
    get().closeConfirmationModal();
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/jobs/delete`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ job_ids: idsToDelete }),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));

      set((state) => ({
        selectedJobIds: new Set(),
        selectedJob:
          state.selectedJob && idsToDelete.includes(state.selectedJob.id)
            ? null
            : state.selectedJob,
      }));
      get().addNotification('Selected jobs deleted.', 'success');
    } catch (error)
      {
      get().addNotification(`Error deleting selected jobs: ${error.message}`, 'error');
    }
  },

  handleSignOut: async () => {
    set({ loading: true });
    const { error } = await supabase.auth.signOut();
    if (error) {
      get().addNotification(`Error signing out: ${error.message}`, 'error');
      set({ loading: false });
    }
    set({
      allJobs: [],
      profiles: [],
      searches: [],
      selectedJob: null,
      loading: false, 
      activeProfileId: null, 
    });
  },
}));