'use client';

import { useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function PasswordForm() {
  const [username, setUsername] = useState('');
  const [value, setValue]       = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const searchParams            = useSearchParams();
  const inputRef                = useRef<HTMLInputElement>(null);

  const next = searchParams.get('next') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res  = await fetch('/api/auth/site-password', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ username, password: value, next }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // Hard navigation so the freshly-set cookie is sent on the next request.
        window.location.assign(data.redirect);
      } else {
        setError('Incorrect username or password. Try again.');
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
            Sign in
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
            Enter your username and password to continue.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Username"
              autoFocus
              autoComplete="username"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
            />

            <input
              ref={inputRef}
              type="password"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
            />

            {error && (
              <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !value || !username}
              className="w-full py-2.5 rounded-xl bg-[#1d1d1f] dark:bg-white text-white dark:text-black text-sm font-semibold transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign in'}
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
