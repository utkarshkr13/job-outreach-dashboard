'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const { loginWithGoogle, loginWithApple, loginAsDemo, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google authentication failed.');
      setIsGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setIsAppleLoading(true);
    setError(null);
    try {
      await loginWithApple();
    } catch (err: any) {
      setError(err.message || 'Apple authentication failed.');
      setIsAppleLoading(false);
    }
  };

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center p-4 overflow-hidden">
      {/* Dynamic breathing background glow circles */}
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-purple-500/10 dark:bg-purple-600/15 rounded-full blur-[80px] animate-pulse duration-[6000ms]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-[100px] animate-pulse duration-[8000ms]"></div>

      {/* Premium Apple-Style Glass Card */}
      <div className="relative z-10 w-full max-w-md p-8 md:p-10 rounded-3xl backdrop-blur-xl bg-white/60 dark:bg-neutral-900/60 border border-white/40 dark:border-neutral-800/40 shadow-2xl transition-all duration-300">
        
        {/* Logo/Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-black dark:bg-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 duration-300">
            <span className="w-4 h-4 bg-white dark:bg-black rounded-md"></span>
          </div>
        </div>

        {/* Headings */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Welcome to Outreach
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Your automated cold email pipeline. No code, no server configuration, just Gmail and Notion.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Actions Deck */}
        <div className="space-y-3.5">
          {/* Continue with Google */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-12 px-4 rounded-xl border border-neutral-250 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium text-sm transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer shadow-sm disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <svg className="animate-spin h-5 w-5 text-neutral-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.2-5.136 4.2A5.632 5.632 0 018.3 12.97a5.632 5.632 0 015.69-5.63 5.518 5.518 0 013.91 1.6l3.12-3.12A9.92 9.92 0 0013.99 2.5a10.03 10.03 0 00-10.02 10.02 10.03 10.03 0 0010.02 10.02c5.3 0 9.83-3.81 9.83-10.02 0-.616-.077-1.16-.216-1.66H12.24z"/>
              </svg>
            )}
            Continue with Google
          </button>

          {/* Continue with Apple */}
          <button
            onClick={handleAppleLogin}
            disabled={loading}
            className="w-full h-12 px-4 rounded-xl border border-neutral-250 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium text-sm transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer shadow-sm disabled:opacity-50"
          >
            {isAppleLoading ? (
              <svg className="animate-spin h-5 w-5 text-neutral-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-current" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.2.67-2.92 1.49-.62.71-1.16 1.85-1.01 2.96 1.12.09 2.27-.58 2.94-1.39z" />
              </svg>
            )}
            Continue with Apple
          </button>

          {/* Elegant Divider */}
          <div className="flex items-center gap-3 py-3 text-neutral-300 dark:text-neutral-800">
            <div className="h-[1px] bg-neutral-200 dark:bg-neutral-800 grow"></div>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-neutral-400 dark:text-neutral-500">Developer Sandbox</span>
            <div className="h-[1px] bg-neutral-200 dark:bg-neutral-800 grow"></div>
          </div>

          {/* Continue in Sandbox / Demo Mode */}
          <button
            onClick={loginAsDemo}
            disabled={loading}
            className="w-full h-11 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-850 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium text-xs transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3M3 12a48.294 48.294 0 00.138 3.662 4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M3 12l-3 3m3-3l3 3M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Enter Local Demo Mode (Skip Auth Keys)
          </button>
        </div>

        {/* Small Print Footer */}
        <p className="mt-8 text-center text-[10px] text-neutral-400 dark:text-neutral-500 leading-relaxed">
          By continuing you agree to our Terms of Service and Privacy Policy. All user credentials and API keys are encrypted client-side using AES-255-CBC before database storage.
        </p>
      </div>
    </div>
  );
}
