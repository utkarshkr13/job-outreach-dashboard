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
    <nav className="fixed top-0 left-0 right-0 z-40 backdrop-blur-md bg-white/70 dark:bg-[#161617]/70 border-b border-[#e8e8ed] dark:border-neutral-900 px-8 py-3 flex items-center justify-between transition-colors duration-300 w-full">
      <div className="flex items-center gap-8">
        <span className="font-semibold text-sm tracking-tight text-[#1d1d1f] dark:text-neutral-100 flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-md shadow-sm transition-all duration-300"></span>
          Outreach Platform
        </span>

        {user && onboardingComplete && !isAuthScreen && (
          <div className="flex items-center gap-6">
            {[
              { href: '/', label: 'Dashboard' },
              { href: '/company', label: 'Companies' },
              { href: '/sent', label: 'Sent' },
              { href: '/analytics', label: 'Analytics' },
              { href: '/settings', label: 'Settings' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`apple-indicator-glow-sweep apple-dock-indicator apple-nav-border apple-zoom-indicator apple-tab-slide apple-indicator-sweep ${
                  pathname === href
                    ? 'active text-[#1d1d1f] dark:text-[#f5f5f7]'
                    : 'text-neutral-500 hover:text-[#1d1d1f] dark:text-neutral-400 dark:hover:text-neutral-200'
                } text-xs font-medium transition-colors`}
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors text-neutral-500 dark:text-neutral-400 flex items-center justify-center border border-neutral-200 dark:border-neutral-800 w-8 h-8 cursor-pointer"
          title={theme === 'dark' ? 'Activate Light Mode' : 'Activate Dark Mode'}
        >
          {theme === 'dark' ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {user && (
          <button
            onClick={logout}
            className="text-xs font-medium px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 hover:border-red-200 dark:hover:border-red-900/30 text-neutral-500 dark:text-neutral-400 cursor-pointer transition-all duration-200 flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        )}

        <div className="apple-dock-divider-line apple-dock-divider-sweep apple-separator-subpixel h-5"></div>

        {(process.env.NEXT_PUBLIC_APP_MODE === 'demo' || !process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'placeholder-api-key') ? (
          <span className="px-3 py-1 rounded-full text-[10px] font-medium bg-blue-50 dark:bg-purple-950/15 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-purple-900/30 flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            Demo mode
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full text-[10px] font-medium bg-neutral-200 dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 border border-neutral-300 dark:border-neutral-850 flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Production mode
          </span>
        )}
      </div>
    </nav>
  );
}
