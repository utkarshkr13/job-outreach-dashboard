'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/company', label: 'Companies' },
  { href: '/sent', label: 'Sent' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/settings', label: 'Settings' },
] as const;

export default function Navbar() {
  const { user, onboardingComplete, logout } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Sliding active-tab indicator geometry
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });

  useEffect(() => {
    const saved = (localStorage.getItem('crm-theme') as 'light' | 'dark' | null) || 'dark';
    setTheme(saved);
    document.documentElement.classList.toggle('dark', saved === 'dark');
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('crm-theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  const isAuthScreen = pathname === '/login' || pathname === '/onboarding';
  const showTabs = !!user && onboardingComplete && !isAuthScreen;

  // Which nav item is active (longest matching prefix, '/' only on exact)
  const activeHref =
    NAV_ITEMS.filter(i => (i.href === '/' ? pathname === '/' : pathname.startsWith(i.href)))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;

  const measure = () => {
    const el = activeHref ? tabRefs.current[activeHref] : null;
    const container = listRef.current;
    if (!el || !container) {
      setIndicator(i => ({ ...i, ready: false }));
      return;
    }
    const c = container.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setIndicator({ left: r.left - c.left, width: r.width, ready: true });
  };

  useLayoutEffect(() => {
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHref, showTabs, mounted]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHref, showTabs]);

  // Never render app chrome on the unauthenticated password gate.
  if (pathname === '/password') return null;

  return (
    <nav
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-6xl rv-interactive"
      style={{
        background: 'color-mix(in srgb, var(--rv-surface) 82%, transparent)',
        border: '1px solid var(--rv-border)',
        borderRadius: 'var(--rv-r-pill)',
        boxShadow: 'var(--rv-shadow-md)',
        backdropFilter: 'blur(18px) saturate(160%)',
        WebkitBackdropFilter: 'blur(18px) saturate(160%)',
      }}
      aria-label="Primary"
    >
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-2.5">
        {/* Brand + tabs */}
        <div className="flex items-center gap-6 min-w-0">
          <span className="flex items-center gap-2 select-none shrink-0">
            <span
              className="w-3 h-3 rounded-[5px] shadow-sm"
              style={{ background: 'linear-gradient(135deg, #22d3ee, var(--rv-accent) 55%, #6366f1)' }}
            />
            <span className="font-semibold text-[13px] tracking-tight" style={{ color: 'var(--rv-text)' }}>
              Outreach Platform
            </span>
          </span>

          {showTabs && (
            <div
              ref={listRef}
              className="relative hidden md:flex items-center gap-1 p-0.5 rounded-full"
              style={{ background: 'var(--rv-surface-2)', border: '1px solid var(--rv-border)' }}
            >
              {/* Sliding highlight */}
              <span
                aria-hidden
                className="absolute top-0.5 bottom-0.5 rounded-full pointer-events-none"
                style={{
                  left: indicator.left,
                  width: indicator.width,
                  background: 'var(--rv-surface)',
                  border: '1px solid var(--rv-border-strong)',
                  boxShadow: 'var(--rv-shadow-sm)',
                  opacity: indicator.ready ? 1 : 0,
                  transition:
                    'left var(--rv-dur-3) var(--rv-ease-spring), width var(--rv-dur-3) var(--rv-ease-spring), opacity var(--rv-dur-2) var(--rv-ease)',
                }}
              />
              {NAV_ITEMS.map(({ href, label }) => {
                const active = href === activeHref;
                return (
                  <Link
                    key={href}
                    href={href}
                    ref={el => {
                      tabRefs.current[href] = el;
                    }}
                    aria-current={active ? 'page' : undefined}
                    className="relative z-10 px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold tracking-wide rv-interactive rv-focus"
                    style={{ color: active ? 'var(--rv-text)' : 'var(--rv-text-3)' }}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            className="relative w-8 h-8 rounded-full flex items-center justify-center rv-interactive rv-press rv-focus"
            style={{ color: 'var(--rv-text-2)', border: '1px solid var(--rv-border)', background: 'var(--rv-surface)' }}
          >
            <span
              className="absolute inset-0 flex items-center justify-center rv-interactive"
              style={{
                opacity: mounted && theme === 'dark' ? 1 : 0,
                transform: mounted && theme === 'dark' ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0.6)',
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </span>
            <span
              className="absolute inset-0 flex items-center justify-center rv-interactive"
              style={{
                opacity: mounted && theme === 'light' ? 1 : 0,
                transform: mounted && theme === 'light' ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0.6)',
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            </span>
          </button>

          {user && (
            <button
              onClick={logout}
              className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full rv-interactive rv-press rv-focus"
              style={{ color: 'var(--rv-text-2)', border: '1px solid var(--rv-border)', background: 'var(--rv-surface)' }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--rv-danger)';
                e.currentTarget.style.borderColor = 'var(--rv-danger)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--rv-text-2)';
                e.currentTarget.style.borderColor = 'var(--rv-border)';
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          )}

          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold select-none"
            style={{ color: 'var(--rv-success)', background: 'var(--rv-success-soft)', border: '1px solid color-mix(in srgb, var(--rv-success) 26%, transparent)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--rv-success)' }} />
            Production
          </span>
        </div>
      </div>
    </nav>
  );
}
