import React, { useState, useMemo } from 'react';
import { useStore } from '../../lib/store';
import { 
    Search, Loader2, Inbox, Plus, Brain, Archive, Filter, 
    Trash2, SortAsc, ChevronDown, X, CheckSquare 
} from 'lucide-react';
import EmptyDashboard from './EmptyDashboard';
import JobCard from '../ui/JobCard';

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="animate-pulse flex flex-col space-y-3">
            <div className="h-5 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="flex gap-2 pt-2">
              <div className="h-5 bg-slate-200 rounded-full w-24"></div>
              <div className="h-5 bg-slate-200 rounded-full w-24"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard({ setSelectedJob, onTriggerJobSearch, isSearching }) {
    
  const [platformFilter, setPlatformFilter] = useState('all'); 
  const [sortOrder, setSortOrder] = useState('date_newest');
  const [isMenuOpen, setIsMenuOpen] = useState(false); 
  const [searchQuery, setSearchQuery] = useState(''); 
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  const allJobs = useStore((state) => state.allJobs);
  const openSearchModal = useStore((state) => state.openSearchModal);
  const handleBulkAnalyze = useStore((state) => state.handleBulkAnalyze);
  const activeProfileId = useStore((state) => state.activeProfileId);
  const selectedJobIds = useStore(state => state.selectedJobIds);
  const toggleJobSelection = useStore(state => state.toggleJobSelection);
  const clearJobSelection = useStore(state => state.clearJobSelection);
  const openConfirmationModal = useStore(state => state.openConfirmationModal);
  const handleDeleteAllJobs = useStore(state => state.handleDeleteAllJobs);
  const handleDeleteSelectedJobs = useStore(state => state.handleDeleteSelectedJobs);
  const searches = useStore(state => state.searches);
  
  const platformFilterOptions = [
      { value: 'all', label: 'All Platforms' },
      { value: 'linkedin', label: 'LinkedIn' },
      { value: 'indeed', label: 'Indeed' },
      { value: 'glassdoor', label: 'Glassdoor' },
  ];
  
  const sortOptions = [
      { value: 'date_newest', label: 'Date (Newest First)' },
      { value: 'title_az', label: 'Title (A-Z)' },
  ];

  const filteredAndSortedJobs = useMemo(() => {
      let processedJobs = [...allJobs]; 

      if (searchQuery) {
          processedJobs = processedJobs.filter(job => 
              job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              job.company.toLowerCase().includes(searchQuery.toLowerCase())
          );
      }

      if (platformFilter !== 'all') {
          processedJobs = processedJobs.filter(job => job.job_url && job.job_url.includes(platformFilter));
      }

      if (sortOrder === 'title_az') {
          processedJobs.sort((a, b) => a.title.localeCompare(b.title));
      } else {
          processedJobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }

      return processedJobs;
  }, [allJobs, platformFilter, sortOrder, searchQuery]);
  
  const jobsToAnalyzeCount = filteredAndSortedJobs.filter(j => !j.gemini_rating && j.description).length;
  const hasSearches = searches.length > 0;

  const handleFilterChange = (e) => {
      setPlatformFilter(e.target.value);
      clearJobSelection(); 
  };
  
  const handleSortChange = (e) => {
      setSortOrder(e.target.value);
  };

  const onDeleteAllClick = () => {
      setIsMenuOpen(false);
      openConfirmationModal(
          "Delete All Jobs",
          "This will permanently delete all jobs that are NOT on your tracker. Are you sure?",
          () => handleDeleteAllJobs()
      );
  };

  const onDeleteSelectedClick = () => {
      setIsMenuOpen(false);
      if (selectedJobIds.size === 0) {
          useStore.getState().addNotification("No jobs selected.", "warning");
          return;
      }
      openConfirmationModal(
          `Delete ${selectedJobIds.size} Job(s)`,
          `Are you sure you want to permanently delete ${selectedJobIds.size} selected job(s)? (Tracked jobs will be skipped)`,
          () => handleDeleteSelectedJobs()
      );
  };

  const handleSelectAll = () => {
      filteredAndSortedJobs.forEach(job => {
          if (!selectedJobIds.has(job.id)) {
              toggleJobSelection(job.id);
          }
      });
  };

  return (
      <div className="space-y-6">
          <section>
              
              <div className={`flex ${selectedJobIds.size === 0 ? 'flex-col md:flex-row' : 'flex-row'} justify-between items-center gap-4 mb-6`}>
                  {selectedJobIds.size === 0 ? (
                      <>
                          <div className="flex-1 w-full md:max-w-2xl">
                              <div className="relative">
                                  <span className="absolute inset-y-0 left-0 flex items-center pl-4">
                                      <Search className="w-5 h-5 text-slate-400" />
                                  </span>
                                  <input
                                      type="text"
                                      placeholder="Search by title or company in your inbox..."
                                      value={searchQuery}
                                      onChange={(e) => setSearchQuery(e.target.value)}
                                      className="w-full bg-white border border-slate-300 rounded-lg pl-12 pr-4 py-2.5 text-sm shadow-sm"
                                  />
                              </div>
                          </div>
                          
                          {/* --- THIS IS THE FIX --- */}
                          <div className="flex flex-row flex-wrap items-center justify-start sm:justify-end gap-2 w-full md:w-auto flex-shrink-0">
                              
                              <div className="relative">
                                  <button
                                      onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                                      className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors w-full"
                                  >
                                      <Filter className="w-4 h-4" />
                                      Filter & Sort
                                  </button>
                                  {isFilterMenuOpen && (
                                      <div 
                                          className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-slate-200 z-10"
                                          onMouseLeave={() => setIsFilterMenuOpen(false)}
                                      >
                                          <div className="p-3 space-y-3">
                                              <div>
                                                  <label className="block text-xs font-medium text-slate-500 mb-1">Sort by</label>
                                                  <select
                                                      value={sortOrder}
                                                      onChange={handleSortChange} 
                                                      className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm font-medium"
                                                  >
                                                      {sortOptions.map(option => (
                                                          <option key={option.value} value={option.value}>{option.label}</option>
                                                      ))}
                                                  </select>
                                              </div>
                                              <div>
                                                  <label className="block text-xs font-medium text-slate-500 mb-1">Platform</label>
                                                  <select
                                                      value={platformFilter}
                                                      onChange={handleFilterChange} 
                                                      className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm font-medium"
                                                  >
                                                      {platformFilterOptions.map(option => (
                                                          <option key={option.value} value={option.value}>{option.label}</option>
                                                      ))}
                                                  </select>
                                              </div>
                                          </div>
                                      </div>
                                  )}
                              </div>

                              <button
                                  onClick={() => handleBulkAnalyze(filteredAndSortedJobs)}
                                  disabled={!activeProfileId || jobsToAnalyzeCount === 0}
                                  className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-semibold text-blue-700 bg-blue-100 border border-blue-200 rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                  <Brain className="w-4 h-4" />
                                   Analyze ({jobsToAnalyzeCount})
                              </button>
                              <button
                                  onClick={onTriggerJobSearch}
                                  disabled={isSearching}
                                  className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 transition-all disabled:bg-sky-300 tour-step-2-find-jobs"
                              >
                                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                  Find Jobs
                              </button>
                          </div>
                          {/* --- END OF FIX --- */}
                      </>
                  ) : (
                      <>
                          <div className="flex items-center gap-3">
                              <button onClick={clearJobSelection} className="p-2 rounded-full hover:bg-slate-100">
                                  <X className="w-5 h-5 text-slate-600" />
                              </button>
                              <h2 className="text-xl font-bold text-sky-700">{selectedJobIds.size} Selected</h2>
                          </div>
                          <div className="flex items-center gap-4">
                              <button
                                  onClick={handleSelectAll}
                                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                              >
                                  <CheckSquare className="w-4 h-4" />
                                  Select All
                              </button>
                              <button
                                  onClick={onDeleteSelectedClick}
                                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                              >
                                  <Trash2 className="w-4 h-4" />
                                  Delete ({selectedJobIds.size})
                              </button>
                          </div>
                      </>
                  )}
              </div>
              
              <div className="bg-white/50 border border-slate-200 rounded-lg p-4 min-h-[300px]">
                  {isSearching && allJobs.length === 0 ? ( 
                      <SkeletonGrid />
                  ) : !hasSearches ? (
                      <EmptyDashboard />
                  ) : filteredAndSortedJobs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 py-10">
                          <Search className="w-16 h-16 mb-4 text-slate-400" />
                          <h3 className="text-lg font-semibold">No jobs found</h3>
                          <p>Your search or filter criteria returned no results.</p>
                      </div>
                  ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredAndSortedJobs.map(job => (
                              <JobCard 
                                  key={job.id} 
                                  job={job} 
                                  setSelectedJob={setSelectedJob}
                                  isSelected={selectedJobIds.has(job.id)}
                                  onToggleSelect={toggleJobSelection}
                              />
                          ))}
                      </div>
                  )}
              </div>
          </section>
      </div>
  );
}