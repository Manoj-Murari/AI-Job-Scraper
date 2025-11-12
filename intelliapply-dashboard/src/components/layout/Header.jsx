import React, { useState, useEffect, useRef } from 'react';
import { 
    Briefcase, 
    Settings, 
    BarChart3, 
    Loader2,
    LogOut,
    User,
    Inbox,
    Archive,
    Menu,
    X,
    Cpu,
    Zap
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabaseClient';
import { Link, NavLink } from 'react-router-dom';

function MobileNavLink({ to, children, onClick }) {
    return (
        <NavLink
            to={to}
            end={to === "/app"}
            onClick={onClick}
            className={({ isActive }) =>
              `flex items-center gap-3 w-full text-left rounded-md p-3 text-base font-medium ${
                isActive
                    ? 'bg-sky-100 text-sky-700'
                    : 'text-slate-700 hover:bg-slate-100'
            }`
            }
        >
            {children}
        </NavLink>
    );
}

function Avatar({ email }) {
  const getInitials = (email) => {
    return email ? email[0].toUpperCase() : <User className="w-4 h-4" />;
  };

  const getColor = (email) => {
    let hash = 0;
    if (!email) return 'bg-slate-500';
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 'bg-sky-500'];
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className={`w-9 h-9 rounded-full ${getColor(email)} flex items-center justify-center font-bold text-white text-sm ring-1 ring-white/20`}>
      {getInitials(email)}
    </div>
  );
}

export default function Header() {
  const isSearching = useStore((state) => state.isSearching);
  const handleSignOut = useStore((state) => state.handleSignOut);
  const profiles = useStore((state) => state.profiles);
  const activeProfileId = useStore((state) => state.activeProfileId);
  const setActiveProfileId = useStore((state) => state.setActiveProfileId);
  
  const [userEmail, setUserEmail] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]); 

  return (
    <>
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md text-slate-600 hover:bg-slate-100 md:hidden"
                aria-label="Open navigation menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              
              <Link to="/" className="flex items-center gap-2 flex-shrink-0">
                <Briefcase className="w-7 h-7 text-sky-600" />
                <h1 className="text-xl font-bold text-slate-800">IntelliApply</h1>
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2">
                <NavLink 
                  to="/app" 
                  end
                  className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-sky-100 text-sky-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <Inbox className="w-4 h-4" />Inbox
                </NavLink>
                <NavLink 
                  to="/app/library" 
                  className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-sky-100 text-sky-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <Archive className="w-4 h-4" />Job Library
                </NavLink>
                <NavLink 
                  to="/app/tracker" 
                  className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-sky-100 text-sky-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <Briefcase className="w-4 h-4" />Tracker
                </NavLink>
                <NavLink 
                  to="/app/analytics" 
                  className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-sky-100 text-sky-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <BarChart3 className="w-4 h-4" />Analytics
                </NavLink>
                
                <button
                  disabled
                  title="Coming Soon"
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-slate-400 cursor-not-allowed opacity-60"
                >
                  <Cpu className="w-4 h-4" />
                  AI Mock Interview
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-500 text-xs font-bold">Soon</span>
                </button>
              </div>

              {profiles.length > 0 && (
                <div className="hidden md:flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" />
                  <select
                    id="global-active-profile"
                    value={activeProfileId || ''}
                    onChange={(e) => setActiveProfileId(e.target.value)}
                    className="text-sm font-medium text-slate-700 bg-transparent border-0 rounded-md focus:ring-0 focus:outline-none"
                    title="Set active AI profile"
                  >
                    {profiles.map(profile => (
                      <option key={profile.id} value={profile.id}>
                        {profile.profile_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {isSearching && (
                <div className="hidden sm:flex items-center gap-2 text-sm font-semibold text-sky-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Searching...</span>
                </div>
              )}
              
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                  className="rounded-full focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                  title="Account settings"
                >
                  <Avatar email={userEmail} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden animate-fade-in-down z-50">
                    <div className="p-4 border-b border-slate-100">
                      <p className="text-sm text-slate-500">Signed in as</p>
                      <p className="font-semibold text-slate-800 truncate" title={userEmail}>{userEmail || "Loading..."}</p>
                    </div>
                    <nav className="p-2">
                      <Link
                        to="/app/settings"
                        onClick={() => setIsDropdownOpen(false)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </nav>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white shadow-lg p-4 space-y-4 z-30 relative">
            <nav className="space-y-1">
              <MobileNavLink to="/app" onClick={() => setIsMobileMenuOpen(false)}>
                <Inbox className="w-5 h-5" />Inbox
              </MobileNavLink>
              <MobileNavLink to="/app/library" onClick={() => setIsMobileMenuOpen(false)}>
                <Archive className="w-5 h-5" />Job Library
              </MobileNavLink>
              <MobileNavLink to="/app/tracker" onClick={() => setIsMobileMenuOpen(false)}>
                <Briefcase className="w-5 h-5" />Tracker
              </MobileNavLink>
              <MobileNavLink to="/app/analytics" onClick={() => setIsMobileMenuOpen(false)}>
                <BarChart3 className="w-5 h-5" />Analytics
              </MobileNavLink>
              
              <button
                disabled
                className="flex items-center justify-between gap-3 w-full text-left rounded-md p-3 text-base font-medium text-slate-400 cursor-not-allowed opacity-60"
              >
                <div className="flex items-center gap-3">
                  <Cpu className="w-5 h-5" />
                  AI Mock Interview
                </div>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-500 text-xs font-bold">Soon</span>
              </button>
            </nav>
            
            {profiles.length > 0 && (
              <div className="border-t border-slate-200 pt-4">
                <label htmlFor="mobile-active-profile" className="text-sm font-medium text-slate-600">Active Profile:</label>
                <select
                  id="mobile-active-profile"
                  value={activeProfileId || ''}
                  onChange={(e) => setActiveProfileId(e.target.value)}
                  className="w-full mt-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500"
                  title="Set active AI profile"
                >
                  {profiles.map(profile => (
                    <option key={profile.id} value={profile.id}>
                      {profile.profile_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </header>
    </>
  );
}