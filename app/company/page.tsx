'use client';

import { useEffect, useState } from 'react';
import { Company, EmailStatus } from '@/types';
import { cleanSalary } from '@/lib/format';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

export default function CompaniesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<EmailStatus | 'All'>('All');
  const [filterType, setFilterType] = useState<'All' | 'Stable' | 'Startup'>('All');

  useEffect(() => {
    async function loadData() {
      try {
        const token = user ? await user.getIdToken() : '';
        const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch('/api/companies', { headers });
        const data = await res.json();
        if (Array.isArray(data)) {
          setCompanies(data);
        }
      } catch (err) {
        console.error('Failed to load companies:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  // Mouse movement effect for Apple Glow Cards
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const cards = document.querySelectorAll('.apple-glow-card');
      cards.forEach(card => {
        const rect = (card as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        (card as HTMLElement).style.setProperty('--mouse-x', `${x}px`);
        (card as HTMLElement).style.setProperty('--mouse-y', `${y}px`);
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [companies]);

  // Compute metrics
  const totalTargeted = companies.length;
  const activeInterviews = companies.filter(c => c.emailStatus === 'Interview').length;
  const resumesMapped = companies.filter(c => c.resumeStatus === 'custom' || c.resumeStatus === 'global').length;
  const offersCount = companies.filter(c => c.emailStatus === 'Offer').length;

  const filteredCompanies = companies.filter(c => {
    const matchesSearch = c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.contactName && c.contactName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'All' ? true : c.emailStatus === filterStatus;
    const matchesType = filterType === 'All' ? true : c.companyType === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="w-full space-y-8 animate-fade-in text-[#1d1d1f] dark:text-[#f5f5f7] transition-colors duration-300">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e8e8ed] dark:border-neutral-900 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">Target Companies</h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
            Database of targeted companies, active recruiters, and strategic pipeline touchpoints.
          </p>
        </div>
      </div>

      {/* ── METRICS DASH DOCK ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.01)] flex flex-col justify-between h-28">
          <span className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500 tracking-wider">Targeted Entities</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-extrabold text-[#1d1d1f] dark:text-neutral-100">{totalTargeted}</span>
            <span className="text-xs text-neutral-400">firms</span>
          </div>
        </div>

        <div className="apple-glow-violet-teal bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.01)] flex flex-col justify-between h-28">
          <span className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500 tracking-wider">Active Interviews</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-extrabold text-amber-500">{activeInterviews}</span>
            <span className="text-xs text-neutral-400">rounds</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.01)] flex flex-col justify-between h-28">
          <span className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500 tracking-wider">Resumes Mapped</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-extrabold text-blue-500">{resumesMapped}</span>
            <span className="text-xs text-neutral-400">customized</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.01)] flex flex-col justify-between h-28">
          <span className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500 tracking-wider">Offers Unlocked</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-extrabold text-emerald-500">{offersCount}</span>
            <span className="text-xs text-neutral-400">contracts</span>
          </div>
        </div>

      </div>

      {/* ── SEARCH & CONTROL CENTER ── */}
      <div className="bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.015)] dark:shadow-none flex flex-col md:flex-row gap-4 items-center justify-between transition-colors duration-300">
        
        <div className="w-full md:w-1/3">
          <input
            type="text"
            placeholder="Search by company, role or recruiter..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#f5f5f7]/60 dark:bg-neutral-900/40 border border-[#e8e8ed] dark:border-neutral-850 rounded-xl px-4 py-2 text-xs text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-700 transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center justify-end">
          
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span>Status:</span>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              className="bg-[#f5f5f7]/60 dark:bg-neutral-900/40 border border-[#e8e8ed] dark:border-neutral-850 rounded-xl px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none transition-colors"
            >
              <option value="All">All Stages</option>
              <option value="New">Extracted</option>
              <option value="Draft Ready">AI Drafts</option>
              <option value="Approved">Approved</option>
              <option value="Sent">Emailed</option>
              <option value="Replied">Replied</option>
              <option value="Interview">Interviews</option>
              <option value="Offer">Offers</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span>Scale:</span>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as any)}
              className="bg-[#f5f5f7]/60 dark:bg-neutral-900/40 border border-[#e8e8ed] dark:border-neutral-850 rounded-xl px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none transition-colors"
            >
              <option value="All">All Types</option>
              <option value="Stable">Stable Enterprise</option>
              <option value="Startup">High-growth Startup</option>
            </select>
          </div>

        </div>

      </div>

      {/* ── COMPANIES DATABASE LIST ── */}
      {loading ? (
        <div className="text-center py-24 text-neutral-500 font-semibold animate-pulse">Consulting companies database...</div>
      ) : filteredCompanies.length === 0 ? (
        <div className="bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl py-24 text-center text-neutral-500 transition-colors duration-300">
          No companies found matching the specified parameters.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map(c => {
            const hasCustomCv = c.resumeStatus === 'custom';
            const hasGlobalCv = c.resumeStatus === 'global';

            return (
              <div 
                key={c.notionId}
                onClick={() => router.push(`/company/${c.notionId}`)}
                className="apple-glow-card apple-grid-spring bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.01)] dark:shadow-none apple-spring hover:border-[#0071e3]/45 flex flex-col justify-between h-[230px] relative overflow-hidden transition-all duration-300 cursor-pointer"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="font-bold text-base text-neutral-800 dark:text-neutral-100 group-hover:text-blue-600 transition-colors truncate w-40">{c.company}</h2>
                      <p className="text-[10px] text-neutral-400 mt-0.5 font-medium">{c.location || 'Remote'}</p>
                    </div>
                    
                    <span className={`text-[8.5px] font-semibold px-2 py-0.5 rounded-full ${
                      c.emailStatus === 'Offer' ? 'bg-green-50 dark:bg-green-950/10 text-green-600 dark:text-green-400 border border-green-150' :
                      c.emailStatus === 'Interview' ? 'bg-amber-50 dark:bg-amber-950/10 text-amber-600 dark:text-amber-500 border border-amber-150' :
                      c.emailStatus === 'Replied' ? 'bg-pink-50 dark:bg-pink-950/10 text-pink-600 dark:text-pink-400 border border-pink-150' :
                      c.emailStatus === 'Sent' ? 'bg-blue-50 dark:bg-purple-950/10 text-blue-600 dark:text-blue-400 border border-blue-150' :
                      c.emailStatus === 'Approved' ? 'bg-emerald-50 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400 border border-emerald-150' :
                      c.emailStatus === 'Draft Ready' ? 'bg-blue-50 dark:bg-blue-950/10 text-blue-600 dark:text-blue-400 border border-blue-150' :
                      c.emailStatus === 'Redo' ? 'bg-orange-50 dark:bg-orange-950/10 text-orange-600 dark:text-orange-400 border border-orange-150' :
                      c.emailStatus === 'Rejected' ? 'bg-red-50 dark:bg-red-950/10 text-red-600 dark:text-red-400 border border-red-150' :
                      'bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-450 border border-neutral-200'
                    }`}>
                      {c.emailStatus || 'New'}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1">
                    <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-250 truncate">{c.role}</p>
                    <p className="text-[10px] text-neutral-400 leading-normal flex items-center gap-1">
                      <span>👤</span> {c.contactName || 'No recruiter mapped'}
                    </p>
                    {c.salaryRange && (
                      <p className="text-[9.5px] text-neutral-400 font-medium">💰 {cleanSalary(c.salaryRange)} LPA Range</p>
                    )}
                  </div>
                </div>

                <div className="border-t border-[#e8e8ed] dark:border-neutral-900/60 pt-3 flex justify-between items-center mt-auto">
                  {hasCustomCv ? (
                    <span className="text-[9px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      Custom Resume Mapped
                    </span>
                  ) : hasGlobalCv ? (
                    <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Global CV Attached
                    </span>
                  ) : (
                    <span className="text-[9px] font-semibold text-neutral-400 dark:text-neutral-550 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-700"></span>
                      No Resume Override
                    </span>
                  )}

                  <div className="flex items-center gap-3.5" onClick={e => e.stopPropagation()}>
                    <span 
                      onClick={() => router.push(`/?drawer=${c.notionId}`)}
                      className="text-[9px] text-blue-600 dark:text-blue-400 font-bold hover:underline select-none cursor-pointer flex items-center gap-0.5"
                    >
                      Open Draft →
                    </span>
                    <span 
                      onClick={() => router.push(`/company/${c.notionId}`)}
                      className="text-[9px] text-[#0071e3] font-bold hover:underline select-none cursor-pointer flex items-center gap-0.5"
                    >
                      Configure →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
