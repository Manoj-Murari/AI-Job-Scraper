import React, { useEffect } from 'react';
import { useStore } from './lib/store';
import { Routes, Route, Navigate } from 'react-router-dom';

import Header from './components/layout/Header';
import Dashboard from './components/features/Dashboard';
import AllJobs from './components/features/AllJobs';
import KanbanTracker from './components/features/KanbanTracker';
import Analytics from './components/features/Analytics.jsx'; 
import Settings from './components/pages/Settings'; 
import JobDetailsPanel from './components/features/JobDetailsPanel';
import ConfirmationModal from './components/ui/ConfirmationModal';
import Toast from './components/ui/Toast';
import AITailoringModal from './components/features/AITailoringModal';
import AICoverLetterModal from './components/features/AICoverLetterModal';
import AIInterviewPrepModal from './components/features/AIInterviewPrepModal';
import ApplicationHelperModal from './components/features/ApplicationHelperModal.jsx';
import WelcomeModal from './components/ui/WelcomeModal'; 
import GlobalLoader from './components/ui/GlobalLoader'; 
import SearchModal from './components/features/SearchModal'; 
import AddJobModal from './components/features/AddJobModal';
import OptimizedResumeModal from './components/features/OptimizedResumeModal';

export default function MainDashboard() {
    const {
        selectedJob, setSelectedJob,
        fetchAllData, subscribeToJobs, unsubscribeFromJobs,
        handleTriggerJobSearch,
        isSearching,
        loading,
        isTailorModalOpen, openTailorModal, closeTailorModal,
        isCoverLetterModalOpen, openCoverLetterModal, closeCoverLetterModal,
        isInterviewPrepModalOpen, openInterviewPrepModal, closeInterviewPrepModal,
        isApplicationHelperOpen, openApplicationHelper, closeApplicationHelper,
        isOptimizedResumeModalOpen, openOptimizedResumeModal, closeOptimizedResumeModal,
        modalState, closeConfirmationModal,
        notifications, removeNotification,
        isWelcomeModalOpen, closeWelcomeModal,
        isSearchModalOpen, closeSearchModal, 
        isAddJobModalOpen, closeAddJobModal,
        allJobs, profiles, searches,
        activeProfileId,
        updateJobStatus
    } = useStore();

    useEffect(() => {
        fetchAllData();
        subscribeToJobs();
        return () => {
            unsubscribeFromJobs();
        };
    }, [fetchAllData, subscribeToJobs, unsubscribeFromJobs]);

    const getActiveProfile = () => {
        if (!activeProfileId || !profiles.length) {
            return null;
        }
        return profiles.find(p => p.id === activeProfileId) || null;
    };

    const activeProfile = getActiveProfile();

    if (loading) {
        return <GlobalLoader />;
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800">
            
            <Header />
            
            <main className="w-full p-4 sm:p-6 lg:p-8">
              <Routes>
                <Route 
                  index 
                  element={
                    <Dashboard 
                      setSelectedJob={setSelectedJob} 
                      onTriggerJobSearch={handleTriggerJobSearch} 
                      isSearching={isSearching} 
                    />
                  } 
                />
                <Route 
                  path="library" 
                  element={
                    <AllJobs 
                      jobs={allJobs} 
                      setSelectedJob={setSelectedJob} 
                    />
                  } 
                />
                <Route 
                  path="tracker" 
                  element={
                    <KanbanTracker 
                      jobs={allJobs} 
                      updateJobStatus={updateJobStatus} 
                    />
                  } 
                />
                <Route 
                  path="analytics" 
                  element={<Analytics jobs={allJobs} profiles={profiles} searches={searches} />} 
                />
                <Route 
                  path="settings" 
                  element={<Settings />} 
                />
                <Route path="*" element={<Navigate to="/app" replace />} />
              </Routes>
            </main>
            
            <JobDetailsPanel 
                job={selectedJob} 
                setSelectedJob={setSelectedJob} 
                onOpenTailorModal={openTailorModal}
                onOpenCoverLetterModal={openCoverLetterModal}
                onOpenApplicationHelper={openApplicationHelper}
                onOpenOptimizedResumeModal={openOptimizedResumeModal}
                activeProfile={activeProfile} 
            />
            
            <WelcomeModal isOpen={isWelcomeModalOpen} onClose={closeWelcomeModal} />
            <SearchModal isOpen={isSearchModalOpen} onClose={closeSearchModal} />
            <AddJobModal isOpen={isAddJobModalOpen} onClose={closeAddJobModal} />
            
            <AITailoringModal isOpen={isTailorModalOpen} onClose={closeTailorModal} job={selectedJob} profile={activeProfile} />
            <AICoverLetterModal isOpen={isCoverLetterModalOpen} onClose={closeCoverLetterModal} job={selectedJob} profile={activeProfile} />
            <AIInterviewPrepModal isOpen={isInterviewPrepModalOpen} onClose={closeInterviewPrepModal} job={selectedJob} profile={activeProfile} />
            <OptimizedResumeModal isOpen={isOptimizedResumeModalOpen} onClose={closeOptimizedResumeModal} job={selectedJob} profile={activeProfile} /> 

            <ApplicationHelperModal 
                isOpen={isApplicationHelperOpen} 
                onClose={closeApplicationHelper} 
                profile={activeProfile}
                jobUrl={selectedJob?.job_url}
            />
            <ConfirmationModal isOpen={modalState.isOpen} onClose={closeConfirmationModal} onConfirm={modalState.onConfirm} title={modalState.title} message={modalState.message} />
            
            <div aria-live="assertive" className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-end">
                <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
                    {notifications.map(notification => ( <Toast key={notification.id} notification={notification} onDismiss={removeNotification} /> ))}
                </div>
            </div>
        </div>
    );
}