'use client';

import { useEffect, useState } from 'react';
import { Company } from '@/types';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function SentPage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const token = user ? await user.getIdToken() : '';
        const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch('/api/companies?status=Sent', { headers });
        const data = await res.json();
        if (Array.isArray(data)) {
          setCompanies(data);
        }
      } catch (err) {
        console.error('Failed to load sent outreaches:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-[#1d1d1f] dark:text-[#f5f5f7] transition-colors duration-300">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-neutral-100">Sent Outreaches</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Archive of cold emails successfully dispatched to recruiters</p>
        </div>
        <Link
          href="/"
          className="bg-white dark:bg-neutral-900 border border-[#e8e8ed] dark:border-neutral-850 hover:bg-neutral-50 dark:hover:bg-neutral-850 px-4 py-2 rounded-full text-xs font-semibold text-neutral-700 dark:text-neutral-300 shadow-sm transition-all"
        >
          📬 Dashboard
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-20 text-neutral-500 font-semibold animate-pulse">Loading sent outreaches...</div>
      ) : companies.length === 0 ? (
        <div className="bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl py-20 text-center text-neutral-500 transition-colors duration-300">
          No sent outreaches found. Approve and send drafts from the main Dashboard!
        </div>
      ) : (
        <div className="grid gap-4">
          {companies.map(c => (
            <div
              key={c.notionId}
              className="bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.012)] dark:shadow-none apple-spring flex justify-between items-start"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h2 className="font-bold text-sm text-neutral-800 dark:text-neutral-100">{c.company}</h2>
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-600/10 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-600/20">
                    Sent
                  </span>
                  
                  {c.openCount && c.openCount > 0 ? (
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 animate-pulse">
                      👁 {c.openCount} Opens
                    </span>
                  ) : null}
                </div>
                
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  <strong className="text-neutral-700 dark:text-neutral-200 font-semibold">{c.role}</strong> · Recruiter: {c.contactName} ({c.email})
                </p>
                
                {c.emailSubject && (
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">
                    "{c.emailSubject}"
                  </p>
                )}
              </div>
              
              <span className="text-[10px] text-neutral-400 font-medium bg-[#f5f5f7] dark:bg-neutral-900 border border-[#e8e8ed] dark:border-neutral-850 px-2.5 py-1 rounded-full">
                {c.dateAdded}
              </span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
