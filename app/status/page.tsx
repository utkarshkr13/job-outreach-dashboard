'use client';

import { useEffect, useState } from 'react';

interface HealthChecks {
  firebase: boolean;
  notionPlatformFallback: boolean;
  anthropic: boolean;
  groq: boolean;
  gmailPlatformOAuth: boolean;
  blobStorage: boolean;
  cronSecretConfigured: boolean;
  demoMode: boolean;
}

interface HealthResponse {
  status: string;
  timestamp: string;
  checks: HealthChecks;
}

const LABELS: Record<keyof HealthChecks, string> = {
  firebase: 'Firebase (auth + credential storage)',
  notionPlatformFallback: 'Notion platform fallback',
  anthropic: 'Anthropic API',
  groq: 'Groq API',
  gmailPlatformOAuth: 'Gmail platform OAuth app',
  blobStorage: 'Vercel Blob storage',
  cronSecretConfigured: 'Cron secret',
  demoMode: 'Demo mode',
};

export default function StatusPage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(null);
    fetch('/api/health')
      .then(res => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then(setData)
      .catch(e => setError(e.message || 'Failed to load health status'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#1d1d1f] dark:text-neutral-100">System Health</h1>
        <button
          onClick={load}
          className="text-xs font-semibold px-3 py-1.5 rounded-full border border-[#e8e8ed] dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
        >
          Refresh
        </button>
      </div>

      {loading && <p className="text-sm text-neutral-500">Checking…</p>}

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-4">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-2">
          <p className="text-xs text-neutral-400 mb-4">
            Last checked {new Date(data.timestamp).toLocaleString()}
            {data.checks.demoMode && ' — running in demo mode'}
          </p>
          {(Object.keys(LABELS) as (keyof HealthChecks)[])
            .filter(key => key !== 'demoMode')
            .map(key => {
              const ok = data.checks[key];
              return (
                <div
                  key={key}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-[#e8e8ed] dark:border-neutral-900 bg-white dark:bg-[#161617]"
                >
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">{LABELS[key]}</span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      ok
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                        : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-500'
                    }`}
                  >
                    {ok ? 'Configured' : 'Not configured'}
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
