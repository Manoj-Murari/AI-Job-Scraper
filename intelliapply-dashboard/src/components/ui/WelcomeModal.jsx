import React from 'react';
import { X, UserPlus, Sparkles } from 'lucide-react';
import { useStore } from '../../lib/store';

export default function WelcomeModal({ isOpen, onClose }) {
  const setView = useStore(state => state.setView);

  const handleGoToProfiles = () => {
    // --- THIS IS THE FIX ---
    // The view is 'settings', not 'profiles'.
    // The 'Settings' page will automatically open to the 'profiles' tab.
    setView('settings');
    // --- END OF FIX ---
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
        <div className="p-6 text-center">
          <Sparkles className="w-16 h-16 text-sky-500 mx-auto mb-4" />
          
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Welcome to IntelliApply!
          </h2>
          
          <p className="text-slate-600 mb-6">
            To get started, let's create your first **Resume Profile**. 
            The AI needs this profile to analyze jobs and tailor content for you.
          </p>
          
          <button
            onClick={handleGoToProfiles}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 transition-all text-lg"
          >
            <UserPlus className="w-5 h-5" />
            Create Your First Profile
          </button>
        </div>
      </div>
    </div>
  );
}