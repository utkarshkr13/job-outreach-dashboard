'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';

function OnboardingContent() {
  const { user, refreshSessionStatus } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // On mount, parse query parameters for step redirection (like returning from Google OAuth redirect)
  const stepParam = searchParams.get('step');
  const successParam = searchParams.get('success') === 'true';
  const errorParam = searchParams.get('error');
  const emailParam = searchParams.get('email');

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 2: Gmail States
  const [gmailConnected, setGmailConnected] = useState<boolean>(false);
  const [connectedGmailUser, setConnectedGmailUser] = useState<string>('');

  // Step 3: Notion States
  const [notionApiKey, setNotionApiKey] = useState<string>('');
  const [notionDbId, setNotionDbId] = useState<string>('');
  const [notionConnected, setNotionConnected] = useState<boolean>(false);

  // Step 4: Profile States
  const [profileName, setProfileName] = useState<string>('');
  const [profilePhone, setProfilePhone] = useState<string>('');
  const [profileLinkedin, setProfileLinkedin] = useState<string>('');
  const [profileBio, setProfileBio] = useState<string>('');
  const [profileRoles, setProfileRoles] = useState<string>('Associate PM or Business Analyst');
  const [anthropicApiKey, setAnthropicApiKey] = useState<string>('');

  // Step 5: Resume States
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUploaded, setResumeUploaded] = useState<boolean>(false);
  const [resumeUrl, setResumeUrl] = useState<string>('');

  useEffect(() => {
    // Pre-fill profile name from user account on load
    if (user && user.displayName) {
      setProfileName(user.displayName);
    }
  }, [user]);

  useEffect(() => {
    // Handle returning from external OAuth redirect state
    if (stepParam === '2') {
      setCurrentStep(2);
      if (successParam && emailParam) {
        setGmailConnected(true);
        setConnectedGmailUser(emailParam);
        setErrorMsg(null);
      } else if (errorParam) {
        setErrorMsg(decodeURIComponent(errorParam));
      }
    }
  }, [stepParam, successParam, errorParam, emailParam]);

  // Gmail Redirect trigger
  const handleGmailConnect = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (!user) {
        throw new Error('User session is not active.');
      }
      const token = await user.getIdToken();
      // Redirect to OAuth initiation endpoint
      window.location.href = `/api/gmail/oauth?token=${token}`;
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initiate Google OAuth.');
      setLoading(false);
    }
  };

  // Notion Test Connection and save
  const handleNotionConnect = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/onboarding/notion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notionApiKey, notionDbId }),
      });
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Connection verification failed.');
      }

      setNotionConnected(true);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to verify Notion connection.');
    } finally {
      setLoading(false);
    }
  };

  // Profile Save
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName || !profileBio || !profileRoles) {
      setErrorMsg('Full Name, Professional Bio, and Target Roles are required.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/onboarding/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profileName,
          phone: profilePhone,
          linkedin: profileLinkedin,
          bio: profileBio,
          targetRoles: profileRoles,
          anthropicApiKey
        }),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save profile settings.');
      }

      setCurrentStep(5);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save profile details.');
    } finally {
      setLoading(false);
    }
  };

  // Resume Upload Handler
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setErrorMsg('Only PDF files are supported.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File exceeds 5MB size limit.');
      return;
    }

    setResumeFile(file);
    setLoading(true);
    setErrorMsg(null);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/resume/upload?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/pdf'
        },
        body: file,
      });
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResumeUploaded(true);
      setResumeUrl(data.url);
      console.log('✅ Resume uploaded successfully:', data.url);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload resume.');
    } finally {
      setLoading(false);
    }
  };

  // Finish Onboarding
  const handleFinishOnboarding = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to finalize onboarding.');
      }

      // Refresh Auth Context to trigger state check and auto-redirect
      await refreshSessionStatus();
      router.push('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete onboarding.');
      setLoading(false);
    }
  };

  // Reset steps parameters from URL when moving forward
  const advanceStep = (next: number) => {
    setErrorMsg(null);
    setCurrentStep(next);
    // Clear URL parameters so we don't trigger previous handlers on reload
    router.replace('/onboarding');
  };

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center p-4">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-violet-600/10 dark:bg-violet-600/15 blur-3xl animate-pulse duration-[7000ms]"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-fuchsia-600/10 dark:bg-fuchsia-600/15 blur-3xl animate-pulse duration-[9000ms]"></div>

      {/* Main Glassmorphic Container Card */}
      <div className="relative z-10 w-full max-w-xl p-8 md:p-10 rounded-3xl backdrop-blur-xl bg-white/60 dark:bg-neutral-900/60 border border-white/40 dark:border-neutral-800/40 shadow-2xl transition-all duration-300">
        
        {/* Onboarding Steps Indicators */}
        <div className="flex items-center justify-between mb-8 px-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center grow last:grow-0">
              <div 
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-350 border ${
                  s === currentStep 
                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white scale-110 shadow-md shadow-violet-500/20' 
                    : s < currentStep
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-200 dark:border-neutral-750'
                }`}
              >
                {s < currentStep ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : s}
              </div>
              {s < 5 && (
                <div 
                  className={`h-0.5 grow mx-2 transition-all duration-350 ${
                    s < currentStep 
                      ? 'bg-emerald-500' 
                      : 'bg-neutral-200 dark:bg-neutral-800'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5 shadow-sm">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="grow">
              <span className="font-semibold block mb-0.5">Setup Error</span>
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* STEP 1: WELCOME SCREEN */}
        {currentStep === 1 && (
          <div className="text-center md:py-4">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-violet-650 dark:bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Welcome to your Cold Outreach Pipeline
            </h2>
            <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-md mx-auto">
              Every morning, Claude generates highly personalised cold emails tailored to your target companies. 
              You simply review, refine, and approve directly from your Gmail inbox.
            </p>
            <div className="mt-6 flex flex-col items-center gap-2.5 text-xs text-neutral-450 dark:text-neutral-500">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                Connected to your personal Notion Database template
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                Sent directly through your own personal Gmail account
              </div>
            </div>
            <div className="mt-8">
              <button
                onClick={() => advanceStep(2)}
                className="w-full md:w-auto px-8 h-12 rounded-xl bg-black text-white dark:bg-white dark:text-black font-semibold text-sm hover:scale-102 transition-all duration-200 cursor-pointer shadow-md flex items-center justify-center gap-2 mx-auto"
              >
                Let's set it up
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CONNECT GMAIL */}
        {currentStep === 2 && (
          <div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mb-2">
              Connect your Gmail Account
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed">
              We require dynamic permission to draft and dispatch personalized emails on your behalf. All mail tasks originate and send direct from your actual email address.
            </p>

            {gmailConnected ? (
              <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/30 flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <span className="font-semibold text-sm text-emerald-800 dark:text-emerald-400 block">Gmail Inbox Linked</span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-500">{connectedGmailUser}</span>
                </div>
              </div>
            ) : (
              <button
                onClick={handleGmailConnect}
                disabled={loading}
                className="w-full h-16 p-4 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-all duration-200 flex items-center justify-center gap-3.5 cursor-pointer mb-8"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-neutral-550" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.2-5.136 4.2A5.632 5.632 0 018.3 12.97a5.632 5.632 0 015.69-5.63 5.518 5.518 0 013.91 1.6l3.12-3.12A9.92 9.92 0 0013.99 2.5a10.03 10.03 0 00-10.02 10.02 10.03 10.03 0 0010.02 10.02c5.3 0 9.83-3.81 9.83-10.02 0-.616-.077-1.16-.216-1.66H12.24z"/>
                  </svg>
                )}
                <span className="font-semibold text-sm">Sign in to link Google Mail</span>
              </button>
            )}

            <div className="flex justify-end gap-3 border-t border-neutral-100 dark:border-neutral-850 pt-6">
              <button
                onClick={() => advanceStep(3)}
                disabled={!gmailConnected}
                className="px-6 h-11 rounded-xl bg-black text-white dark:bg-white dark:text-black font-semibold text-sm hover:scale-102 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                Next Step
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CONNECT NOTION */}
        {currentStep === 3 && (
          <div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mb-2">
              Connect Notion Database CRM
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed">
              We sync lead records directly to your Notion CRM database. Paste your credentials below to test integration connectivity.
            </p>

            <div className="space-y-4 mb-6">
              {/* Help Links */}
              <div className="flex flex-col gap-2.5 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-850/50 border border-neutral-150 dark:border-neutral-800 text-xs">
                <a 
                  href="https://utkarshkr13.notion.site/Job-Outreach-Tracker-154df656a87747e98d9ee812a1f9e812?v=154df656a8774db9b897000c01fa1a1d" 
                  target="_blank" 
                  rel="noreferrer"
                  className="font-medium text-violet-600 hover:text-violet-750 dark:text-violet-400 dark:hover:text-violet-300 flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                  1. Duplicate Notion Database Template (One-Click)
                </a>
                <a 
                  href="https://www.notion.so/my-integrations" 
                  target="_blank" 
                  rel="noreferrer"
                  className="font-medium text-violet-600 hover:text-violet-750 dark:text-violet-400 dark:hover:text-violet-300 flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  2. Create Notion API Integration and grant access to the DB
                </a>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
                  Notion Integration Token
                </label>
                <input
                  type="password"
                  placeholder="secret_..."
                  value={notionApiKey}
                  onChange={(e) => { setNotionApiKey(e.target.value); setNotionConnected(false); }}
                  className="w-full h-11 px-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
                  Notion Database ID
                </label>
                <input
                  type="text"
                  placeholder="32-character hexadecimal database ID"
                  value={notionDbId}
                  onChange={(e) => { setNotionDbId(e.target.value); setNotionConnected(false); }}
                  className="w-full h-11 px-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                />
              </div>
            </div>

            <div className="mb-8">
              {notionConnected ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-250 dark:border-emerald-900/30 text-xs text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                  <svg className="w-4.5 h-4.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Notion connected and database template verified successfully!</span>
                </div>
              ) : (
                <button
                  onClick={handleNotionConnect}
                  disabled={loading || !notionApiKey || !notionDbId}
                  className="w-full h-11 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-850 dark:text-neutral-200 font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm border border-neutral-200 dark:border-neutral-800"
                >
                  {loading ? (
                    <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : 'Verify Connection Ping'}
                </button>
              )}
            </div>

            <div className="flex justify-between gap-3 border-t border-neutral-100 dark:border-neutral-850 pt-6">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 h-11 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={() => advanceStep(4)}
                disabled={!notionConnected}
                className="px-6 h-11 rounded-xl bg-black text-white dark:bg-white dark:text-black font-semibold text-sm hover:scale-102 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                Next Step
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: YOUR PROFILE */}
        {currentStep === 4 && (
          <form onSubmit={handleProfileSave}>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mb-2">
              Configure Sender Profile
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed">
              This identity metadata constructs the context variables injected into Claude's generation prompts and signature tags.
            </p>

            <div className="space-y-4 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Jane Smith"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-sm focus:outline-none focus:border-black dark:focus:border-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+91 9999999999"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-sm focus:outline-none focus:border-black dark:focus:border-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
                  LinkedIn Profile URL
                </label>
                <input
                  type="text"
                  placeholder="linkedin.com/in/jane-smith"
                  value={profileLinkedin}
                  onChange={(e) => setProfileLinkedin(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-sm focus:outline-none focus:border-black dark:focus:border-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
                  Target Roles
                </label>
                <input
                  type="text"
                  required
                  placeholder="Associate PM or Business Analyst"
                  value={profileRoles}
                  onChange={(e) => setProfileRoles(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-sm focus:outline-none focus:border-black dark:focus:border-white"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                    Anthropic API Key (Claude)
                  </label>
                  <a 
                    href="https://console.anthropic.com/" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[10px] text-violet-650 hover:underline dark:text-violet-400"
                  >
                    Get API Key
                  </a>
                </div>
                <input
                  type="password"
                  placeholder="sk-ant-..."
                  value={anthropicApiKey}
                  onChange={(e) => setAnthropicApiKey(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-sm focus:outline-none focus:border-black dark:focus:border-white"
                />
                <span className="text-[10px] text-neutral-450 dark:text-neutral-500 mt-1 block">
                  Keys are stored AES-256 encrypted. Optional: leave blank to request demo sandbox usage.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
                  Professional Bio
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="A brief 1-2 sentence background that highlights your core experience (e.g. 'I am a PM who has shipped mobile apps with 10M+ downloads...')"
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  className="w-full p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-sm focus:outline-none focus:border-black dark:focus:border-white resize-none"
                />
              </div>
            </div>

            <div className="flex justify-between gap-3 border-t border-neutral-100 dark:border-neutral-850 pt-6">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-6 h-11 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 h-11 rounded-xl bg-black text-white dark:bg-white dark:text-black font-semibold text-sm hover:scale-102 transition-all duration-200 disabled:opacity-40 cursor-pointer flex items-center gap-2"
              >
                {loading ? (
                  <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : 'Save & Continue'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 5: UPLOAD RESUME */}
        {currentStep === 5 && (
          <div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mb-2">
              Upload Resume PDF
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed">
              Your resume PDF is automatically annexed as a dynamic attachment to every cold outreach email dispatched.
            </p>

            <div className="mb-6">
              {resumeUploaded ? (
                <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-250 dark:border-emerald-900/30 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="grow">
                    <span className="font-semibold text-sm text-emerald-800 dark:text-emerald-400 block">Resume Synced</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-500 block break-all">{resumeFile ? resumeFile.name : 'resume.pdf'}</span>
                  </div>
                  <button 
                    onClick={() => { setResumeUploaded(false); setResumeFile(null); }}
                    className="text-xs font-semibold text-neutral-500 hover:text-red-500 dark:text-neutral-400 transition-colors"
                  >
                    Replace
                  </button>
                </div>
              ) : (
                <div className="relative group">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleResumeUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    disabled={loading}
                  />
                  <div className="h-44 border-2 border-dashed border-neutral-200 dark:border-neutral-800 group-hover:border-black dark:group-hover:border-white rounded-2xl flex flex-col items-center justify-center p-6 text-center transition-colors">
                    {loading ? (
                      <div className="flex flex-col items-center gap-2.5">
                        <svg className="animate-spin h-6 w-6 text-violet-650" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="text-xs text-neutral-500">Uploading PDF document...</span>
                      </div>
                    ) : (
                      <>
                        <svg className="w-10 h-10 text-neutral-400 group-hover:text-neutral-550 mb-3 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="font-semibold text-xs text-neutral-700 dark:text-neutral-300">Drag resume PDF here or click to browse</span>
                        <span className="text-[10px] text-neutral-450 dark:text-neutral-500 mt-1">PDF format only, maximum size 5MB</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-850 pt-6">
              <button
                onClick={() => setCurrentStep(4)}
                className="px-6 h-11 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Back
              </button>
              
              <div className="flex gap-3">
                {!resumeUploaded && (
                  <button
                    onClick={handleFinishOnboarding}
                    disabled={loading}
                    className="px-5 h-11 rounded-xl text-neutral-500 dark:text-neutral-400 font-medium text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    Skip for now
                  </button>
                )}
                <button
                  onClick={handleFinishOnboarding}
                  disabled={loading}
                  className="px-6 h-11 rounded-xl bg-black text-white dark:bg-white dark:text-black font-semibold text-sm hover:scale-102 transition-all duration-200 cursor-pointer shadow-md flex items-center gap-2"
                >
                  {loading ? (
                    <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : 'Go to Dashboard'}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[80vh] flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-neutral-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
