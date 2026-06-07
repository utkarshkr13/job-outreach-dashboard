'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export default function Navbar() {
  const { user, onboardingComplete, logout } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const pathname = usePathname();

  useEffect(() => {
    const savedTheme = localStorage.getItem('crm-theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('crm-theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const isAuthScreen = pathname === '/login' || pathname === '/onboarding';

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-6xl px-6 py-2.5 rounded-full border border-white/40 dark:border-neutral-900 bg-white/85 dark:bg-[#161617]/80 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] flex items-center justify-between transition-all duration-300">
      <div className="flex items-center gap-8">
        <span className="font-bold text-xs tracking-tight text-[#1d1d1f] dark:text-neutral-100 flex items-center gap-2 select-none">
          <span className="w-3 h-3 bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-500 rounded-md shadow-sm animate-pulse"></span>
          Outreach Platform
        </span>

        {user && onboardingComplete && !isAuthScreen && (
          <div className="flex items-center gap-1.5 bg-neutral-200/40 dark:bg-neutral-900/40 p-0.5 rounded-full border border-neutral-200/30 dark:border-neutral-800/30">
            {[
              { href: '/', label: 'Dashboard' },
              { href: '/company', label: 'Companies' },
              { href: '/sent', label: 'Sent' },
              { href: '/analytics', label: 'Analytics' },
              { href: '/settings', label: 'Settings' },
            ].map(({ href, label }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 ${
                    isActive
                      ? 'bg-white dark:bg-neutral-850 text-neutral-850 dark:text-white shadow-sm border border-neutral-200/40 dark:border-neutral-800/40'
                      : 'text-neutral-500 hover:text-neutral-850 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-200/20 dark:hover:bg-neutral-800/20'
                  }`}
                >
                  {label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_8px_#0071e3] scale-100 animate-pulse"></span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 transition-colors text-neutral-500 dark:text-neutral-400 flex items-center justify-center border border-neutral-250/50 dark:border-neutral-800/50 w-8 h-8 cursor-pointer active:scale-95"
          title={theme === 'dark' ? 'Activate Light Mode' : 'Activate Dark Mode'}
        >
          {theme === 'dark' ? (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {user && (
          <button
            onClick={logout}
            className="text-[10px] font-bold px-3 py-2 rounded-full border border-neutral-250/50 dark:border-neutral-800/50 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 text-neutral-500 dark:text-neutral-400 cursor-pointer transition-all duration-200 flex items-center gap-1 active:scale-95"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        )}

        <div className="w-[1px] h-4 bg-neutral-200 dark:bg-neutral-800"></div>

        {(process.env.NEXT_PUBLIC_APP_MODE === 'demo' || !process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'placeholder-api-key') ? (
          <span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            Demo
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Production
          </span>
        )}
      </div>
    </nav>
  );
}
