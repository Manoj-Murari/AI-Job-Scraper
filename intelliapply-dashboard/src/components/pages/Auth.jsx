// src/components/pages/Auth.jsx
import React from 'react';
import { Auth as SupabaseAuth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../../lib/supabaseClient'; // Import our new client

export default function Auth() {
    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
            <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
                <h1 className="text-3xl font-bold text-center mb-2">IntelliApply</h1>
                <p className="text-center text-slate-600 mb-8">Sign in to access your dashboard</p>
                <SupabaseAuth
                    supabaseClient={supabase}
                    appearance={{ theme: ThemeSupa }}
                    // --- THIS IS THE FIX ---
                    // This array now ONLY includes 'google'
                    providers={['google']} 
                    // --- END OF FIX ---
                    theme="light"
                />
            </div>
        </div>
    );
}