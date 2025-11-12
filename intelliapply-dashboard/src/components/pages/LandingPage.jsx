import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Search, BrainCircuit, LayoutDashboard, Cpu, Menu, X, Github } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

// 1. Header Component (Hash Link Fix)
function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'GitHub', href: 'https://github.com/Manoj-Murari/AI-Job-Scraper', external: true },
    { name: 'Sign In', href: '/app', external: false },
  ];

  return (
    <header className="bg-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8" aria-label="Global">
        {/* Logo */}
        <div className="flex lg:flex-1">
          <Link to="/" className="-m-1.5 p-1.5 flex items-center gap-2">
            <span className="sr-only">IntelliApply</span>
            <Briefcase className="h-8 w-auto text-sky-600" />
            <span className="text-xl font-bold text-slate-900">IntelliApply</span>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-slate-700"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open main menu</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:items-center lg:gap-x-8">
          {navLinks.map((item) => {
            // --- THIS IS THE FIX ---
            // Use <a> for hash links or external links
            if (item.href.startsWith('#') || item.external) {
              return (
                <a
                  key={item.name}
                  href={item.href}
                  target={item.external ? '_blank' : '_self'}
                  rel={item.external ? 'noopener noreferrer' : ''}
                  className="text-sm font-semibold leading-6 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  {item.name}
                </a>
              );
            }
            // Use <Link> only for internal app routes like /app
            return (
              <Link
                key={item.name}
                to={item.href}
                className="text-sm font-semibold leading-6 text-slate-600 hover:text-slate-900 transition-colors"
              >
                {item.name}
              </Link>
            );
            // --- END OF FIX ---
          })}
          <Link
            to="/app"
            className="rounded-md bg-sky-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 transition-colors"
          >
            Get Started for Free
          </Link>
        </div>
      </nav>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="lg:hidden" role="dialog" aria-modal="true">
          <div className="fixed inset-0 z-50" />
          <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-slate-900/10">
            <div className="flex items-center justify-between">
              <Link to="/" className="-m-1.5 p-1.5 flex items-center gap-2">
                <span className="sr-only">IntelliApply</span>
                <Briefcase className="h-8 w-auto text-sky-600" />
                <span className="text-xl font-bold text-slate-900">IntelliApply</span>
              </Link>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-slate-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-slate-500/10">
                <div className="space-y-2 py-6">
                  {navLinks.map((item) => {
                    // --- APPLY SAME FIX TO MOBILE MENU ---
                    if (item.href.startsWith('#') || item.external) {
                      return (
                        <a
                          key={item.name}
                          href={item.href}
                          target={item.external ? '_blank' : '_self'}
                          rel={item.external ? 'noopener noreferrer' : ''}
                          onClick={() => setMobileMenuOpen(false)}
                          className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-slate-900 hover:bg-slate-50"
                        >
                          {item.name}
                        </a>
                      );
                    }
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-slate-900 hover:bg-slate-50"
                      >
                        {item.name}
                      </Link>
                    );
                    // --- END OF FIX ---
                  })}
                </div>
                <div className="py-6">
                  <Link
                    to="/app"
                    className="-mx-3 block rounded-lg bg-sky-600 px-3 py-2.5 text-center text-base font-semibold leading-7 text-white hover:bg-sky-500"
                  >
                    Get Started for Free
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

// 2. Hero Component
function Hero() {
  return (
    <div className="bg-white">
      <div className="relative isolate px-6 lg:px-8">
        <div className="mx-auto max-w-2xl py-24 sm:py-32">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
              Your job search, automated.
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              IntelliApply scrapes, analyzes, and tracks job postings for you, so you can focus on what matters: landing the interview.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                to="/app"
                className="rounded-md bg-sky-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 transition-colors"
              >
                Get Started for Free
              </Link>
            </div>
            
            <div className="mt-16 flex justify-center gap-x-6 sm:gap-x-12 lg:gap-x-16">
              <div>
                <span className="block text-xl sm:text-2xl font-bold text-slate-900">AI-Powered</span>
                <span className="block text-xs sm:text-sm text-slate-500">Smart Rankings</span>
              </div>
              <div>
                <span className="block text-xl sm:text-2xl font-bold text-slate-900">All-in-One</span>
                <span className="block text-xs sm:text-sm text-slate-500">Tracker</span>
              </div>
              <div>
                <span className="block text-xl sm:text-2xl font-bold text-slate-900">24/7</span>
                <span className="block text-xs sm:text-sm text-slate-500">Monitoring</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// 3. Features Component
const features = [
  {
    name: 'Automated Job Scraping',
    description: 'Pulls new jobs 24/7 from LinkedIn, Indeed, and more based on your smart searches.',
    icon: Search,
  },
  {
    name: 'AI-Powered Analysis',
    description: 'Our AI ranks every job against your resume, giving you a "fit score" from 1-10.',
    icon: BrainCircuit,
  },
  {
    name: 'Smart Kanban Tracker',
    description: 'Manage all your applications in a simple, drag-and-drop board.',
    icon: LayoutDashboard,
  },
  {
    name: 'AI Mock Interview',
    description: 'Practice your interview skills with an AI that asks you questions based on your resume and the job description.',
    icon: Cpu,
    soon: true,
  },
];

function Features() {
  return (
    <div id="features" className="bg-slate-50/70 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Everything you need to land your dream job
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Powerful automation meets intelligent insights
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-4 md:grid-cols-2">
            {features.map((feature) => (
              <div 
                key={feature.name} 
                className="flex flex-col p-6 rounded-lg border border-slate-200 bg-white shadow-sm transition-all duration-300 ease-in-out hover:shadow-xl hover:border-sky-400/50 hover:-translate-y-1"
              >
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-slate-900">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100">
                    <feature.icon className="h-5 w-5 flex-none text-sky-600" aria-hidden="true" />
                  </div>
                  {feature.name}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                  <p className="flex-auto text-sm">{feature.description}</p>
                </dd>
                {feature.soon && (
                  <div className="mt-4">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      Coming Soon
                    </span>
                  </div>
                )}
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

// 4. "How It Works" Component
const steps = [
  {
    number: '01',
    name: 'Create Your Profile',
    description: 'Upload your resume and set your job preferences. Our AI learns what you\'re looking for.',
  },
  {
    number: '02',
    name: 'Run Your Search',
    description: 'Activate smart searches. We\'ll continuously monitor job boards and find new opportunities.',
  },
  {
    number: '03',
    name: 'Apply & Track',
    description: 'Review AI-scored matches, apply with one click, and track everything in your personalized board.',
  },
];

function HowItWorks() {
  return (
    <div id="how-it-works" className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Get started in minutes, not hours
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <dl className="space-y-10">
            {steps.map((step) => (
              <div 
                key={step.name} 
                className="relative flex flex-col items-start sm:flex-row sm:gap-x-8 group transition-all duration-300 ease-in-out p-4 rounded-lg hover:bg-slate-50"
              >
                <dt className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-100 text-lg font-semibold text-sky-600 transition-colors group-hover:bg-sky-200">
                    {step.number}
                  </div>
                </dt>
                <dd className="mt-4 sm:mt-0">
                  <h3 className="text-xl font-semibold leading-7 text-slate-900 transition-colors group-hover:text-sky-600">{step.name}</h3>
                  <p className="mt-2 text-base leading-7 text-slate-600">{step.description}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}


// 5. Footer Component
function Footer() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-center text-xs leading-5 text-slate-500 sm:text-left">
            &copy; 2025 IntelliApply. All rights reserved.
          </p>
          <div className="flex justify-center space-x-6">
            <a href="https://github.com/Manoj-Murari/AI-Job-Scraper" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-900 transition-colors">
              <span className="sr-only">GitHub</span>
              <Github className="h-6 w-6" aria-hidden="true" />
            </a>
            <a href="#" className="text-xs leading-5 text-slate-400 hover:text-slate-900 transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-xs leading-5 text-slate-400 hover:text-slate-900 transition-colors">
              Contact
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component that assembles the page
export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/app', { replace: true });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        navigate('/app', { replace: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="bg-white">
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
}