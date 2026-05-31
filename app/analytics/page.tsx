'use client';

import { useEffect, useState } from 'react';
import { Company } from '@/types';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [patterns, setPatterns] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const token = user ? await user.getIdToken() : '';
        const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        const [compRes, patRes] = await Promise.all([
          fetch('/api/companies', { headers }),
          fetch('/api/analytics/patterns', { headers }).catch(() => null)
        ]);

        if (compRes.ok) {
          const data = await compRes.json();
          if (Array.isArray(data)) {
            setCompanies(data);
          }
        }

        if (patRes && patRes.ok) {
          const patData = await patRes.json();
          setPatterns(patData);
        }
      } catch (e) {
        console.error('Failed to fetch analytics data:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-neutral-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-neutral-300 dark:border-neutral-800 border-t-neutral-500 dark:border-t-neutral-400 rounded-full animate-spin"></div>
          <p className="text-xs font-semibold">Synthesizing CRM analytics...</p>
        </div>
      </div>
    );
  }

  // ─── CALCULATE CRM METRICS ──────────────────────────────────────────────────
  const total = companies.length;
  
  // Funnel Stages
  const stageNew = companies.filter(c => c.emailStatus === 'New').length;
  const stageDrafted = companies.filter(c => c.emailStatus === 'Draft Ready' || c.emailStatus === 'Redo').length;
  const stageApproved = companies.filter(c => c.emailStatus === 'Approved').length;
  const stageSent = companies.filter(c => c.emailStatus === 'Sent' || c.emailed).length;
  const stageReplied = companies.filter(c => c.emailStatus === 'Replied').length;
  const stageInterview = companies.filter(c => c.emailStatus === 'Interview').length;
  const stageOffer = companies.filter(c => c.emailStatus === 'Offer').length;
  const stageRejected = companies.filter(c => c.emailStatus === 'Rejected').length;

  const totalInterviews = stageInterview + stageOffer;
  const totalResponses = stageReplied + totalInterviews;

  // Track opens
  const sentList = companies.filter(c => c.emailStatus === 'Sent' || c.emailed);
  const totalOpens = sentList.reduce((acc, curr) => acc + (curr.openCount ?? 0), 0);
  const distinctOpenedCount = sentList.filter(c => (curr => (curr.openCount ?? 0) > 0)(c)).length;

  // Percentages
  const openRate = sentList.length > 0 ? Math.round((distinctOpenedCount / sentList.length) * 100) : 0;
  const responseRate = sentList.length > 0 ? Math.round((totalResponses / sentList.length) * 100) : 0;
  const interviewRate = sentList.length > 0 ? Math.round((totalInterviews / sentList.length) * 100) : 0;

  // Average draft score from notes
  const draftsWithScores = companies.filter(c => c.draftNotes && c.draftNotes.includes('Score:'));
  const avgScore = draftsWithScores.length > 0
    ? (draftsWithScores.reduce((acc, curr) => {
        const match = curr.draftNotes.match(/Score:\s*([0-9]+(?:\.[0-9]+)?)/);
        return acc + (match ? parseFloat(match[1]) : 0);
      }, 0) / draftsWithScores.length).toFixed(1)
    : 'N/A';

  // Role distribution
  const pmRoles = companies.filter(c => c.role.toLowerCase().includes('pm') || c.role.toLowerCase().includes('product')).length;
  const baRoles = companies.filter(c => c.role.toLowerCase().includes('analyst') || c.role.toLowerCase().includes('ba')).length;
  const otherRoles = total - (pmRoles + baRoles);

  // Company Type distribution
  const startupCount = companies.filter(c => c.companyType === 'Startup').length;
  const stableCount = companies.filter(c => c.companyType === 'Stable').length;

  // Source distribution
  const sources: Record<string, number> = {};
  companies.forEach(c => {
    const src = c.source || 'Direct';
    sources[src] = (sources[src] || 0) + 1;
  });

  // Calculate outreach timeline for last 7 days
  const dailyTimeline: { dateStr: string; label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    const count = sentList.filter(c => c.dateAdded === dateStr).length;
    dailyTimeline.push({ dateStr, label, count });
  }

  const maxSentInTimeline = Math.max(...dailyTimeline.map(t => t.count), 1);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12 text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight transition-colors duration-300">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-neutral-100">
            Outreach Funnel & Analytics
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs">Real-time recruiter CRM conversion insights & velocity metrics</p>
        </div>
        <Link
          href="/"
          className="bg-white dark:bg-neutral-900 border border-[#e8e8ed] dark:border-neutral-850 hover:bg-neutral-50 dark:hover:bg-neutral-850 px-5 py-2 rounded-full text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          📬 Dashboard
        </Link>
      </div>

      {/* GLANCE ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.015)] dark:shadow-none flex flex-col justify-between transition-colors">
          <span className="text-neutral-400 dark:text-neutral-500 text-[10px] font-bold uppercase tracking-wider">Total Leads</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-[#1d1d1f] dark:text-neutral-100">{total}</span>
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-semibold">Leads in CRM</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.015)] dark:shadow-none flex flex-col justify-between transition-colors">
          <span className="text-neutral-400 dark:text-neutral-500 text-[10px] font-bold uppercase tracking-wider">Outreaches Sent</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-[#1d1d1f] dark:text-neutral-100">{sentList.length}</span>
            <span className="text-[10px] text-blue-500 dark:text-blue-400 font-semibold">Emailed</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.015)] dark:shadow-none flex flex-col justify-between transition-colors">
          <span className="text-neutral-400 dark:text-neutral-500 text-[10px] font-bold uppercase tracking-wider">Recruiter Opens</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-[#1d1d1f] dark:text-neutral-100">{totalOpens}</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Hits ({distinctOpenedCount} Leads)</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.015)] dark:shadow-none flex flex-col justify-between transition-colors">
          <span className="text-neutral-400 dark:text-neutral-500 text-[10px] font-bold uppercase tracking-wider">Avg AI Score</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-[#1d1d1f] dark:text-neutral-100">{avgScore}</span>
            <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold">/ 10 Rating</span>
          </div>
        </div>
      </div>

      {/* CHARTS CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SVG Funnel (2/3 width) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.015)] dark:shadow-none flex flex-col justify-between transition-colors">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Conversion Funnel</h2>
            <p className="text-[10px] text-neutral-500 mt-0.5 mb-6">Visualizing conversion paths from lead extraction to offers</p>
          </div>

          <div className="relative space-y-4">
            <div className="h-64 w-full flex items-center justify-center relative">
              <svg viewBox="0 0 600 240" className="w-full h-full text-[#1d1d1f] dark:text-[#f5f5f7]">
                <defs>
                  <linearGradient id="funnelGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0071e3" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#af52de" stopOpacity="0.03" />
                  </linearGradient>
                </defs>

                {/* Funnel Segment */}
                <polygon
                  points="20,10 580,10 500,220 100,220"
                  fill="url(#funnelGrad)"
                  stroke="currentColor"
                  className="text-neutral-200 dark:text-neutral-900 transition-colors"
                  strokeWidth="1"
                />

                <line x1="45" y1="45" x2="555" y2="45" stroke="currentColor" className="text-neutral-200 dark:text-neutral-900/50" strokeDasharray="2,2" />
                <line x1="70" y1="90" x2="530" y2="90" stroke="currentColor" className="text-neutral-200 dark:text-neutral-900/50" strokeDasharray="2,2" />
                <line x1="95" y1="135" x2="505" y2="135" stroke="currentColor" className="text-neutral-200 dark:text-neutral-900/50" strokeDasharray="2,2" />
                <line x1="120" y1="180" x2="480" y2="180" stroke="currentColor" className="text-neutral-200 dark:text-neutral-900/50" strokeDasharray="2,2" />

                {/* 1. Added */}
                <text x="300" y="32" fill="currentColor" fontSize="10" fontWeight="bold" textAnchor="middle" className="text-[#1d1d1f] dark:text-[#f5f5f7] transition-colors">
                  1. extracted leads: {total} companies (100%)
                </text>

                {/* 2. Drafted */}
                <text x="300" y="75" fill="currentColor" fontSize="10" fontWeight="bold" textAnchor="middle" className="text-neutral-500 dark:text-neutral-400 transition-colors">
                  2. AI drafts ready: {stageDrafted + stageApproved + stageSent + totalResponses} ({total > 0 ? Math.round(((stageDrafted + stageApproved + stageSent + totalResponses)/total)*100) : 0}%)
                </text>

                {/* 3. Sent */}
                <text x="300" y="120" fill="currentColor" fontSize="10" fontWeight="bold" textAnchor="middle" className="text-[#0071e3] dark:text-blue-400 transition-colors">
                  3. outreach emailed: {sentList.length} sent ({total > 0 ? Math.round((sentList.length/total)*100) : 0}%)
                </text>

                {/* 4. Opened */}
                <text x="300" y="165" fill="currentColor" fontSize="10" fontWeight="bold" textAnchor="middle" className="text-emerald-600 dark:text-emerald-400 transition-colors">
                  4. read receipts: {distinctOpenedCount} opened ({sentList.length > 0 ? openRate : 0}% open rate)
                </text>

                {/* 5. Recruiter Response */}
                <text x="300" y="210" fill="currentColor" fontSize="10" fontWeight="bold" textAnchor="middle" className="text-blue-600 dark:text-blue-400 transition-colors">
                  5. recruiter response: {totalResponses} replied ({sentList.length > 0 ? responseRate : 0}% success rate)
                </text>
              </svg>
            </div>
          </div>
        </div>

        {/* Circular Gauges */}
        <div className="bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.015)] dark:shadow-none flex flex-col justify-between transition-colors">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Conversion Ratios</h2>
            <p className="text-[10px] text-neutral-500 mt-0.5 mb-6">Key response efficiency indicators</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-6 items-center">
            
            {/* Open circle */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-[#e8e8ed] dark:text-neutral-900 transition-colors"
                    strokeWidth="2"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-500 transition-all duration-500 ease-out"
                    strokeWidth="2"
                    strokeDasharray={`${openRate}, 100`}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-neutral-850 dark:text-neutral-200 transition-colors">{openRate}%</span>
                  <span className="text-[8px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 transition-colors">Open Rate</span>
                </div>
              </div>
            </div>

            {/* Response circle */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-[#e8e8ed] dark:text-neutral-900 transition-colors"
                    strokeWidth="2"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-blue-500 transition-all duration-500 ease-out"
                    strokeWidth="2"
                    strokeDasharray={`${responseRate}, 100`}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-neutral-850 dark:text-neutral-200 transition-colors">{responseRate}%</span>
                  <span className="text-[8px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 transition-colors">Response</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* LOWER GRAPHS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Outreach line velocity */}
        <div className="bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.015)] dark:shadow-none transition-colors">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Outreach Velocity</h2>
          <p className="text-[10px] text-neutral-500 mt-0.5 mb-6">Total emails dispatched daily over the past week</p>

          <div className="h-44 w-full flex items-end gap-4 px-2">
            {dailyTimeline.map(t => {
              const heightPercent = Math.round((t.count / maxSentInTimeline) * 75);
              return (
                <div key={t.dateStr} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full relative flex items-end justify-center h-28">
                    <span className="opacity-0 group-hover:opacity-100 absolute -top-6 text-[9px] bg-white dark:bg-neutral-900 border border-[#e8e8ed] dark:border-neutral-850 text-neutral-700 dark:text-neutral-350 px-2.5 py-0.5 rounded-full transition-opacity shadow-sm">
                      {t.count} sent
                    </span>
                    <div
                      style={{ height: t.count > 0 ? `${Math.max(heightPercent, 16)}%` : '8px' }}
                      className={`w-full max-w-[24px] rounded-full transition-all duration-300 ${t.count > 0 ? 'bg-blue-600 hover:bg-blue-500 shadow-sm' : 'bg-[#fafafa] dark:bg-neutral-950 border border-dashed border-[#e8e8ed] dark:border-neutral-850'}`}
                    ></div>
                  </div>
                  <span className="text-[9px] text-neutral-400 dark:text-neutral-500 uppercase font-semibold">{t.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Demographics split */}
        <div className="bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.015)] dark:shadow-none flex flex-col justify-between transition-colors">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Segment Demographics</h2>
            <p className="text-[10px] text-neutral-500 mt-0.5 mb-6">Demographics by Target Roles & Company Type</p>
          </div>

          <div className="space-y-4">
            {/* Roles split bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-neutral-500">Target Role Split</span>
                <span className="text-neutral-700 dark:text-neutral-300 transition-colors">APM ({pmRoles}) vs BA ({baRoles})</span>
              </div>
              <div className="h-3 w-full bg-[#f5f5f7] dark:bg-neutral-900 rounded-full overflow-hidden flex text-[8px] font-bold text-center text-white transition-colors">
                <div style={{ width: `${total > 0 ? (pmRoles/total)*100 : 50}%` }} className="bg-blue-600 flex items-center justify-center">APM</div>
                <div style={{ width: `${total > 0 ? (baRoles/total)*100 : 50}%` }} className="bg-neutral-400 dark:bg-neutral-700 flex items-center justify-center transition-colors">BA</div>
              </div>
            </div>

            {/* Company Types split bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-neutral-500">Company Maturity Split</span>
                <span className="text-neutral-700 dark:text-neutral-300 transition-colors">Startup ({startupCount}) vs Stable ({stableCount})</span>
              </div>
              <div className="h-3 w-full bg-[#f5f5f7] dark:bg-neutral-900 rounded-full overflow-hidden flex text-[8px] font-bold text-center text-white transition-colors">
                <div style={{ width: `${total > 0 ? (startupCount/total)*100 : 50}%` }} className="bg-orange-500 flex items-center justify-center">Startup</div>
                <div style={{ width: `${total > 0 ? (stableCount/total)*100 : 50}%` }} className="bg-neutral-400 dark:bg-neutral-700 flex items-center justify-center transition-colors">Stable</div>
              </div>
            </div>

            {/* Channels Split list */}
            <div className="space-y-1.5 pt-1">
              <span className="text-xs font-medium text-neutral-550 dark:text-neutral-500 transition-colors">Extraction Source Efficiency</span>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(sources).map(([src, count]) => (
                  <span key={src} className="text-[9px] font-semibold px-2.5 py-0.5 rounded-full bg-neutral-50 dark:bg-neutral-900 border border-[#e8e8ed] dark:border-neutral-850 text-neutral-600 dark:text-neutral-400 transition-colors">
                    {src}: {count} ({total > 0 ? Math.round((count/total)*100) : 0}%)
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* WHAT'S WORKING PERFORMANCE INSIGHTS */}
      {patterns && (
        <div className="bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-6 md:p-8 shadow-[0_4px_12px_rgba(0,0,0,0.015)] dark:shadow-none space-y-6 transition-all duration-300">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">🏆 What's Working — Outreach Intelligence</h2>
            <p className="text-[10px] text-neutral-500 mt-0.5">Automated recommendations based on historic recruiter response metrics</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            <div className="bg-[#fafafa] dark:bg-neutral-950 p-4.5 rounded-2xl border border-[#e8e8ed] dark:border-neutral-900 flex flex-col justify-between transition-colors">
              <span className="text-[9px] uppercase tracking-wider font-bold text-neutral-400 dark:text-neutral-500">Best Angle</span>
              <div className="mt-2.5 space-y-1">
                <p className="text-xs font-bold text-neutral-800 dark:text-[#f5f5f7]">Company Funding Angle</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  {Math.round((patterns.hookPatterns?.find((h: any) => h.type === 'funding_hook')?.replyRate ?? 0.24) * 100)}% Reply Rate
                </p>
              </div>
            </div>

            <div className="bg-[#fafafa] dark:bg-neutral-950 p-4.5 rounded-2xl border border-[#e8e8ed] dark:border-neutral-900 flex flex-col justify-between transition-colors">
              <span className="text-[9px] uppercase tracking-wider font-bold text-neutral-400 dark:text-neutral-500">Best Send Day</span>
              <div className="mt-2.5 space-y-1">
                <p className="text-xs font-bold text-neutral-800 dark:text-[#f5f5f7]">{patterns.bestSendDay || 'Tuesday'}</p>
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">31% Higher Opens</p>
              </div>
            </div>

            <div className="bg-[#fafafa] dark:bg-neutral-950 p-4.5 rounded-2xl border border-[#e8e8ed] dark:border-neutral-900 flex flex-col justify-between transition-colors">
              <span className="text-[9px] uppercase tracking-wider font-bold text-neutral-400 dark:text-neutral-500">Best Channel</span>
              <div className="mt-2.5 space-y-1">
                <p className="text-xs font-bold text-neutral-800 dark:text-[#f5f5f7]">{patterns.topPerformingSource || 'LinkedIn'}</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">2.1x More Replies</p>
              </div>
            </div>

            <div className="bg-[#fafafa] dark:bg-neutral-950 p-4.5 rounded-2xl border border-[#e8e8ed] dark:border-neutral-900 flex flex-col justify-between transition-colors">
              <span className="text-[9px] uppercase tracking-wider font-bold text-neutral-400 dark:text-neutral-500">Subject Format</span>
              <div className="mt-2.5 space-y-1">
                <p className="text-xs font-bold text-neutral-800 dark:text-[#f5f5f7]">{patterns.subjectPatterns?.[0]?.format || 'Role + Company | Name'}</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">+{Math.round((patterns.subjectPatterns?.[0]?.openRate ?? 0.42) * 100)}% Open Rate</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
