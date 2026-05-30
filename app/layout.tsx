'use client';

import { Inter } from 'next/font/google';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const pathname = usePathname();

  // Load and apply theme on startup
  useEffect(() => {
    const savedTheme = localStorage.getItem('crm-theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('crm-theme', newTheme);
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <html lang="en" className={theme}>
      <body className={`${inter.className} transition-colors duration-300 min-h-screen bg-[#f5f5f7] dark:bg-[#000000] text-[#1d1d1f] dark:text-[#f5f5f7]`}>
        
        {/* FROSTED STICKY APPLE NAVBAR */}
        <nav className="sticky top-0 z-40 backdrop-blur-md bg-white/70 dark:bg-[#161617]/70 border-b border-[#e8e8ed] dark:border-neutral-900 px-8 py-3 flex items-center justify-between transition-colors duration-300">
          <div className="flex items-center gap-8">
            <span className="font-semibold text-sm tracking-tight text-[#1d1d1f] dark:text-neutral-100 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#1d1d1f] dark:bg-[#f5f5f7] rounded-sm transition-colors"></span>
              Outreach CRM
            </span>
            <div className="flex items-center gap-6">
              <a
                href="/"
                className={`apple-dock-indicator ${pathname === '/' ? 'active text-[#1d1d1f] dark:text-[#f5f5f7]' : 'text-neutral-500 hover:text-[#1d1d1f] dark:text-neutral-400 dark:hover:text-neutral-200'} text-xs font-medium transition-colors`}
              >
                Dashboard
              </a>
              <a
                href="/sent"
                className={`apple-dock-indicator ${pathname === '/sent' ? 'active text-[#1d1d1f] dark:text-[#f5f5f7]' : 'text-neutral-500 hover:text-[#1d1d1f] dark:text-neutral-400 dark:hover:text-neutral-200'} text-xs font-medium transition-colors`}
              >
                Sent
              </a>
              <a
                href="/analytics"
                className={`apple-dock-indicator ${pathname === '/analytics' ? 'active text-[#1d1d1f] dark:text-[#f5f5f7]' : 'text-neutral-500 hover:text-[#1d1d1f] dark:text-neutral-400 dark:hover:text-neutral-200'} text-xs font-medium transition-colors`}
              >
                Analytics
              </a>
              <a
                href="/settings"
                className={`apple-dock-indicator ${pathname === '/settings' ? 'active text-[#1d1d1f] dark:text-[#f5f5f7]' : 'text-neutral-500 hover:text-[#1d1d1f] dark:text-neutral-400 dark:hover:text-neutral-200'} text-xs font-medium transition-colors`}
              >
                Settings
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="apple-dock-divider-line"></div>
            {/* Elegant light/dark toggle switcher */}
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

            {process.env.NEXT_PUBLIC_APP_MODE === 'demo' ? (
              <span className="px-3 py-1 rounded-full text-[10px] font-medium bg-neutral-200 dark:bg-neutral-900 text-orange-600 dark:text-orange-400 border border-neutral-300 dark:border-neutral-850 flex items-center gap-1.5 shadow-sm transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                Demo mode
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-[10px] font-medium bg-neutral-200 dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 border border-neutral-300 dark:border-neutral-850 flex items-center gap-1.5 shadow-sm transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Production mode
              </span>
            )}
          </div>
        </nav>
        
        <main className="p-6 md:p-8">{children}</main>
      </body>
    </html>
  );
}
