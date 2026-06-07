'use client';

import { useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

function PasswordForm() {
  const [value, setValue]     = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const searchParams          = useSearchParams();
  const router                = useRouter();
  const inputRef              = useRef<HTMLInputElement>(null);

  const next = searchParams.get('next') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res  = await fetch('/api/auth/site-password', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ password: value, next }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        window.location.assign(data.redirect);
      } else {
        setError('Incorrect password. Try again.');
        setValue('');
        inputRef.current?.focus();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] dark:bg-black px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="w-3 h-3 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-md shadow-sm" />
          <span className="font-semibold text-sm tracking-tight text-[#1d1d1f] dark:text-neutral-100">
            Outreach Platform
          </span>
        </div>

        <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-sm">
          <h1 className="text-base font-semibold text-neutral-900 dark:text-white mb-1">
            Protected access
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
            Enter the site password to continue.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              ref={inputRef}
              type="password"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="Password"
              autoFocus
              required
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
            />

            {error && (
              <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !value}
              className="w-full py-2.5 rounded-xl bg-[#1d1d1f] dark:bg-white text-white dark:text-black text-sm font-semibold transition hover:opacity-90 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? 'Verifyingâ€¦' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function PasswordPage() {
  return (
    <Suspense>
      <PasswordForm />
    </Suspense>
  );
}
