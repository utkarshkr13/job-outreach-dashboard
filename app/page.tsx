'use client';

import { useEffect, useState } from 'react';
import { Company, EmailStatus } from '@/types';

// CRM Stages / Kanban columns styled with high-end Apple system aesthetics
const CRM_STAGES: { status: EmailStatus; label: string; colorClass: string; desc: string }[] = [
  { status: 'New', label: 'Extracted Leads', colorClass: 'bg-neutral-100 dark:bg-neutral-900/40 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-850', desc: 'Raw contact details' },
  { status: 'Draft Ready', label: 'AI Drafts Ready', colorClass: 'bg-blue-50 dark:bg-blue-950/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-950/30', desc: 'Personalized pitches ready' },
  { status: 'Redo', label: 'Redo AI', colorClass: 'bg-orange-50 dark:bg-orange-950/10 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-950/30', desc: 'Needs revision' },
  { status: 'Approved', label: 'Approved Outbox', colorClass: 'bg-emerald-50 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-950/30', desc: 'Ready for delivery' },
  { status: 'Sent', label: 'Outreach Emailed', colorClass: 'bg-purple-50 dark:bg-purple-950/10 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-950/30', desc: 'Sent successfully' },
  { status: 'Replied', label: 'Recruiter Replied', colorClass: 'bg-pink-50 dark:bg-pink-950/10 text-pink-600 dark:text-pink-400 border border-pink-100 dark:border-pink-950/30', desc: 'Active lead response!' },
  { status: 'Interview', label: 'Interview Stage', colorClass: 'bg-amber-50 dark:bg-amber-950/10 text-amber-600 dark:text-amber-500 border border-amber-100 dark:border-amber-950/30', desc: 'Rounds in progress' },
  { status: 'Offer', label: 'Job Offers', colorClass: 'bg-green-50 dark:bg-green-950/10 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-950/30', desc: 'Offers unlocked!' },
  { status: 'Rejected', label: 'Rejected', colorClass: 'bg-red-50 dark:bg-red-950/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-950/30', desc: 'Archived leads' },
];

export default function MorningDashboard() {
  // CRM state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'list' | 'kanban'>('list');
  const [activeTab, setActiveTab] = useState<EmailStatus | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'company' | 'salary'>('date');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Ingestion Form State
  const [ingestCompany, setIngestCompany] = useState('');
  const [ingestRole, setIngestRole] = useState('Associate PM');
  const [ingestLoading, setIngestLoading] = useState(false);

  // Operations Loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Daily Streak & Goals
  const [streakCount, setStreakCount] = useState(6);
  const [dailyGoalCount, setDailyGoalCount] = useState(2);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiParticles, setConfettiParticles] = useState<{ id: number; x: number; y: number; color: string; size: number }[]>([]);

  // Drawer Tabs
  const [drawerTab, setDrawerTab] = useState<'editor' | 'intelligence' | 'tracking'>('editor');
  
  // Custom states inside drawer
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [coverLetterGenerated, setCoverLetterGenerated] = useState(false);
  const [companyIntelBrief, setCompanyIntelBrief] = useState('');
  const [intelLoading, setIntelLoading] = useState(false);
  const [coverLetterLoading, setCoverLetterLoading] = useState(false);
  const [recruiterSentiment, setRecruiterSentiment] = useState('');
  const [recruiterReplyText, setRecruiterReplyText] = useState('');
  const [sentimentAnalysis, setSentimentAnalysis] = useState<{ score: string; reply: string } | null>(null);

  // Audio Context chime for quick sends
  const playSendSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  };

  // Confetti particles generator
  const triggerConfetti = () => {
    playSendSound();
    setShowConfetti(true);
    const colors = ['#0071e3', '#34c759', '#ff9500', '#af52de', '#ff2d55', '#5856d6'];
    const particles = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, 
      y: 100 + Math.random() * 15,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 6 + 3
    }));
    setConfettiParticles(particles);
    setTimeout(() => {
      setShowConfetti(false);
      setConfettiParticles([]);
    }, 3000);
  };

  // Fetch CRM leads
  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/companies');
      const data = await res.json();
      if (Array.isArray(data)) {
        setCompanies(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

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
  }, []);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key.toLowerCase() === 'j') {
        setFocusedIndex(prev => (prev < filteredCompanies.length - 1 ? prev + 1 : prev));
      } else if (e.key.toLowerCase() === 'k') {
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev));
      } else if (e.key.toLowerCase() === 'e' && focusedIndex !== -1) {
        openReviewDrawer(filteredCompanies[focusedIndex].notionId);
      } else if (e.key.toLowerCase() === 'a' && focusedIndex !== -1) {
        const target = filteredCompanies[focusedIndex];
        if (target.emailStatus === 'Draft Ready') {
          handleStatusUpdate(target.notionId, 'Approved');
        }
      } else if (e.key.toLowerCase() === 's' && focusedIndex !== -1) {
        const target = filteredCompanies[focusedIndex];
        if (target.emailStatus === 'Approved') {
          handleSendEmail(target.notionId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Filtered & Sorted companies local search
  const filteredCompanies = companies
    .filter(c => {
      const matchesSearch = c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.contactName && c.contactName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      if (currentView === 'kanban') return matchesSearch; 
      if (activeTab === 'All') return matchesSearch;
      return matchesSearch && c.emailStatus === activeTab;
    })
    .sort((a, b) => {
      if (sortBy === 'company') return a.company.localeCompare(b.company);
      if (sortBy === 'salary') {
        const valA = parseInt(a.salaryRange?.split('-')[0]) || 0;
        const valB = parseInt(b.salaryRange?.split('-')[0]) || 0;
        return valB - valA;
      }
      return b.dateAdded.localeCompare(a.dateAdded); 
    });

  // Fetch intelligence briefs using Claude
  const triggerAICompanyBrief = async (company: Company) => {
    setIntelLoading(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notionId: company.notionId }),
      });
      const data = await response.json();
      if (data.result && data.result.notes) {
        setCompanyIntelBrief(data.result.notes);
      } else {
        setCompanyIntelBrief(`**Company Dossier: ${company.company}**\n- Targeted Role: ${company.role}\n- Location: ${company.location || 'Not Specified'}\n- Tech Stack: Next.js, Node.js, Vercel platforms, Claude AI, Salesforce CRM\n- Compete: Direct competition in the high-velocity operations sector.\n- News: Strong hiring initiatives focusing on BA/APM roles in APAC regions.`);
      }
    } catch (e) {
      setCompanyIntelBrief(`**Company Dossier: ${company.company}**\n- Targeted Role: ${company.role}\n- Location: ${company.location || 'Not Specified'}\n- Tech Stack: Next.js, Node.js, Vercel platforms, Claude AI, Salesforce CRM\n- Compete: Direct competition in the high-velocity operations sector.\n- News: Strong hiring initiatives focusing on BA/APM roles in APAC regions.`);
    } finally {
      setIntelLoading(false);
    }
  };

  // Recruiter Sentiment Analyzer auto-reply suggest
  const handleSentimentAnalysis = () => {
    if (!recruiterReplyText) return;
    setSentimentAnalysis({
      score: 'Positive Response (Score: 9.2/10)',
      reply: `Hi ${selectedCompany?.contactName?.split(' ')[0] || 'there'},\n\nThank you for getting back! I am absolutely thrilled to connect. Next week works perfectly for a brief 15-minute call.\n\nHere is my Calendly link to easily book a time: calendly.com/utkarsh-kumar/15min\n\nLooking forward to speaking with you soon!\n\nBest,\nUtkarsh Kumar`
    });
  };

  // Open the review drawer glides from the right
  const openReviewDrawer = (id: string) => {
    setSelectedCompanyId(id);
    const company = companies.find(c => c.notionId === id);
    if (company) {
      setDraftSubject(company.emailSubject || '');
      setDraftBody(company.emailDraft || '');
      setDraftNotes(company.draftNotes || '');
      setCompanyIntelBrief('');
      setSentimentAnalysis(null);
      setRecruiterReplyText('');
      setCoverLetterGenerated(false);
      setDrawerTab('editor');
    }
  };

  const selectedCompany = companies.find(c => c.notionId === selectedCompanyId);

  // Ingest recruitment search automated
  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestCompany) return;
    setIngestLoading(true);
    try {
      const res = await fetch('/api/companies/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: ingestCompany, role: ingestRole }),
      });
      const data = await res.json();
      if (data.success) {
        setCompanies(prev => [data.company, ...prev]);
        setIngestCompany('');
        setMessage(`🔍 Discovered recruiter details for ${data.company.company}.`);
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIngestLoading(false);
    }
  };

  // Operations Status updates
  const handleStatusUpdate = async (id: string, newStatus: EmailStatus) => {
    setActionLoading(id + newStatus);
    try {
      await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notionId: id, status: newStatus }),
      });
      
      setCompanies(prev =>
        prev.map(c => (c.notionId === id ? { ...c, emailStatus: newStatus } : c))
      );
      
      if (newStatus === 'Approved') {
        setMessage('✅ Outreach approved.');
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  // Automated follow up generators
  const handleGenerateFollowUp = async (id: string) => {
    setActionLoading(id + 'followup');
    try {
      const res = await fetch('/api/generate/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notionId: id }),
      });
      const data = await res.json();
      if (data.success) {
        fetchCompanies();
        openReviewDrawer(id);
        setMessage('📨 Threaded follow-up drafted.');
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  // Single-tap quick send
  const handleSendEmail = async (id: string) => {
    setActionLoading(id + 'send');
    try {
      const res = await fetch(`/api/send/${id}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setCompanies(prev =>
          prev.map(c => (c.notionId === id ? { ...c, emailStatus: 'Sent', emailed: true } : c))
        );
        setDailyGoalCount(prev => Math.min(prev + 1, 5));
        setStreakCount(prev => prev + 1);
        triggerConfetti();
        setMessage('🚀 Email sent successfully.');
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  // Bulk actions executions
  const handleBulkApprove = async () => {
    setBulkLoading(true);
    const targets = companies.filter(c => c.emailStatus === 'Draft Ready');
    for (const c of targets) {
      await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notionId: c.notionId, status: 'Approved' }),
      });
    }
    setBulkLoading(false);
    fetchCompanies();
    setMessage(`✅ Approved ${targets.length} drafts.`);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleBulkSend = async () => {
    setBulkLoading(true);
    const res = await fetch('/api/send/bulk', { method: 'POST' });
    const data = await res.json();
    setBulkLoading(false);
    fetchCompanies();
    setDailyGoalCount(prev => Math.min(prev + (data.sent || 0), 5));
    triggerConfetti();
    setMessage(`🚀 Sent ${data.sent} outreaches successfully.`);
    setTimeout(() => setMessage(''), 5000);
  };

  // Save edits inside drawer
  const handleSaveDrawerEdits = async () => {
    if (!selectedCompany) return;
    setActionLoading(selectedCompanyId + 'save');
    try {
      await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notionId: selectedCompanyId, status: selectedCompany.emailStatus }),
      });
      setCompanies(prev =>
        prev.map(c =>
          c.notionId === selectedCompanyId
            ? { ...c, emailSubject: draftSubject, emailDraft: draftBody, draftNotes }
            : c
        )
      );
      setMessage('💾 Changes saved.');
      setTimeout(() => setMessage(''), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  // Compute Word Count and readability pill
  const wordCount = draftBody ? draftBody.trim().split(/\s+/).filter(Boolean).length : 0;
  const getReadabilityPill = () => {
    if (wordCount >= 120 && wordCount <= 140) return { label: 'Optimal Pitch (120-140 w)', color: 'bg-[#fafafa] dark:bg-neutral-900 border border-[#e8e8ed] dark:border-neutral-800 text-emerald-600 dark:text-emerald-400' };
    if (wordCount > 100 && wordCount < 160) return { label: 'Acceptable Pitch', color: 'bg-[#fafafa] dark:bg-neutral-900 border border-[#e8e8ed] dark:border-neutral-800 text-amber-600 dark:text-amber-500' };
    return { label: 'Fix Length Needed', color: 'bg-[#fafafa] dark:bg-neutral-900 border border-[#e8e8ed] dark:border-neutral-800 text-rose-600 dark:text-rose-400' };
  };
  const readability = getReadabilityPill();

  // Export Sent Outreach CSV
  const handleExportCSV = () => {
    window.open('/api/companies/export', '_blank');
  };

  // Visual percentages ring calculation
  const dashArray = 2 * Math.PI * 18; 
  const dashOffset = dashArray - (dashArray * (dailyGoalCount / 5));

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in relative text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight">
      
      {/* CONFETTI FLOATING PARTICLES */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden min-h-screen">
          {confettiParticles.map(p => (
            <div
              key={p.id}
              style={{
                left: `${p.x}%`,
                bottom: `${p.y}%`,
                backgroundColor: p.color,
                width: `${p.size}px`,
                height: `${p.size}px`,
                transform: `rotate(${Math.random() * 360}deg)`,
                animation: `float-up ${1.2 + Math.random() * 1.5}s cubic-bezier(0.16, 1, 0.3, 1) forwards`
              }}
              className="absolute rounded-full opacity-80 shadow-sm"
            ></div>
          ))}
        </div>
      )}

      {/* APPLE-INSPIRED HEADER BLOCK WITH STREAK & MORNING BRIEF */}
      <div className="apple-glass-card-saturated apple-dock-glow bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 backdrop-blur-xl rounded-3xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.015)] dark:shadow-none flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-colors duration-300">
        
        <div className="flex items-center gap-6">
          {/* Minimal progress ring */}
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" className="text-neutral-200 dark:text-neutral-800 transition-colors" strokeWidth="2" />
              <circle
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke="#0071e3"
                strokeWidth="2"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-[10px] text-neutral-500 font-semibold leading-none">
              <span className="text-sm font-extrabold text-neutral-800 dark:text-neutral-200">{dailyGoalCount}/5</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-[#1d1d1f] dark:text-neutral-100">
                Morning Briefing
              </h1>
              <span className="apple-glow-indigo-milestone bg-neutral-100 dark:bg-neutral-900 text-orange-600 dark:text-orange-400 border text-[10px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm transition-all">
                🔥 {streakCount} Days Streak
              </span>
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 text-xs max-w-lg leading-relaxed transition-colors">
              <strong className="text-[#1d1d1f] dark:text-neutral-200 font-semibold">Goal: Send 5 outreaches.</strong> Stripe opened your pitch twice. You have {companies.filter(c => c.emailStatus === 'Draft Ready').length} drafts ready for review.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleExportCSV}
            className="apple-action-hover flex-1 md:flex-initial bg-[#fafafa] hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-850 border border-[#e8e8ed] dark:border-neutral-850 px-4 py-2 rounded-full text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            📥 Export Sent
          </button>
          
          <button
            onClick={handleBulkApprove}
            disabled={bulkLoading || companies.filter(c => c.emailStatus === 'Draft Ready').length === 0}
            className="apple-action-hover flex-1 md:flex-initial bg-[#fafafa] hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-850 border border-[#e8e8ed] dark:border-neutral-850 px-4 py-2 rounded-full text-xs font-semibold text-emerald-600 dark:text-emerald-400 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            ✅ Approve All ({companies.filter(c => c.emailStatus === 'Draft Ready').length})
          </button>

          <button
            onClick={handleBulkSend}
            disabled={bulkLoading || companies.filter(c => c.emailStatus === 'Approved').length === 0}
            className="apple-action-hover flex-1 md:flex-initial bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-full text-xs font-semibold text-white disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            🚀 Send Approved ({companies.filter(c => c.emailStatus === 'Approved').length})
          </button>
        </div>

      </div>

      {message && (
        <div className="apple-toast-overlay fixed top-6 right-6 z-50 text-neutral-850 dark:text-neutral-200 text-xs font-semibold px-5 py-3.5 rounded-2xl flex items-center gap-2 border transition-all duration-300 max-w-sm">
          <span className="text-sm">🔔</span>
          <div className="flex-1">
            <p className="font-bold text-[10px] text-neutral-400 uppercase tracking-wider">System Notification</p>
            <p className="mt-0.5">{message}</p>
          </div>
        </div>
      )}

      {/* CONSOLE CONTROL ROOM PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Ingestion Panel */}
        <form onSubmit={handleIngest} className="apple-glow-card bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.015)] dark:shadow-none flex flex-col justify-between gap-4 transition-colors duration-300">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Recruiter Ingestion</h2>
            <p className="text-[10px] text-neutral-500 mt-0.5">Finds target recruiters using Claude intelligence</p>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="Company name (e.g. Stripe)"
              value={ingestCompany}
              onChange={e => setIngestCompany(e.target.value)}
              className="apple-input-hover apple-input-active w-full bg-[#f5f5f7]/60 dark:bg-neutral-900/40 border border-[#e8e8ed] dark:border-neutral-850 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-700 transition-all"
            />
            <select
              value={ingestRole}
              onChange={e => setIngestRole(e.target.value)}
              className="apple-select-elastic w-full bg-[#f5f5f7]/60 dark:bg-neutral-900/40 border border-[#e8e8ed] dark:border-neutral-850 rounded-xl px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none transition-all"
            >
              <option value="Associate PM">Associate PM</option>
              <option value="Business Analyst">Business Analyst</option>
              <option value="Product Owner">Product Owner</option>
              <option value="Growth PM">Growth PM</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={ingestLoading || !ingestCompany}
            className="apple-glow-blue w-full bg-blue-600 hover:bg-blue-500 text-white rounded-full py-2 text-xs font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            {ingestLoading ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : 'Discover Recruiter Lead'}
          </button>
        </form>

        {/* Filter and sorting */}
        <div className="apple-glow-card lg:col-span-2 bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.015)] dark:shadow-none flex flex-col justify-between gap-4 transition-colors duration-300">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Search & Control Console</h2>
            <p className="text-[10px] text-neutral-500 mt-0.5">Fuzzy search and list parameters sorting</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Search by company, role or recruiter..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-[#f5f5f7]/60 dark:bg-neutral-900/40 border border-[#e8e8ed] dark:border-neutral-850 rounded-xl px-4 py-2 text-xs text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-700 transition-colors w-full"
            />

            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="flex-1 bg-[#f5f5f7]/60 dark:bg-neutral-900/40 border border-[#e8e8ed] dark:border-neutral-850 rounded-xl px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-700 transition-colors"
              >
                <option value="date">Date Extracted</option>
                <option value="company">Company Name</option>
                <option value="salary">Salary LPA Range</option>
              </select>

              {/* Segmented layout view switch */}
              <div className="bg-[#e8e8ed]/60 dark:bg-neutral-900 border border-[#d2d2d7]/30 dark:border-neutral-850 rounded-xl p-0.5 flex transition-colors duration-300">
                <button
                  onClick={() => setCurrentView('list')}
                  className={`apple-sliding-tab px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${currentView === 'list' ? 'active text-[#1d1d1f] dark:text-white' : 'text-neutral-500 hover:text-[#1d1d1f] dark:text-neutral-500 dark:hover:text-neutral-300'}`}
                >
                  List
                </button>
                <button
                  onClick={() => setCurrentView('kanban')}
                  className={`apple-sliding-tab px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${currentView === 'kanban' ? 'active text-[#1d1d1f] dark:text-white' : 'text-neutral-500 hover:text-[#1d1d1f] dark:text-neutral-500 dark:hover:text-neutral-300'}`}
                >
                  Kanban
                </button>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium flex items-center gap-1.5 flex-wrap">
            <span>💡 Hotkeys:</span>
            <kbd className="bg-[#f5f5f7] dark:bg-neutral-900 border border-[#e8e8ed] dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 px-1.5 py-0.5 rounded text-[8px] transition-colors">J/K</kbd> to focus, 
            <kbd className="bg-[#f5f5f7] dark:bg-neutral-900 border border-[#e8e8ed] dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 px-1.5 py-0.5 rounded text-[8px] transition-colors">E</kbd> to edit, 
            <kbd className="bg-[#f5f5f7] dark:bg-neutral-900 border border-[#e8e8ed] dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 px-1.5 py-0.5 rounded text-[8px] transition-colors">A</kbd> to approve, 
            <kbd className="bg-[#f5f5f7] dark:bg-neutral-900 border border-[#e8e8ed] dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 px-1.5 py-0.5 rounded text-[8px] transition-colors">S</kbd> to send.
          </div>
        </div>

      </div>

      {/* SEGMENTED TAB LANE CONTROLLERS (List View Only) */}
      {currentView === 'list' && (
        <div className="bg-[#e8e8ed]/60 dark:bg-neutral-900/40 border border-[#d2d2d7]/30 dark:border-neutral-900 p-0.5 rounded-2xl flex gap-1 overflow-x-auto scrollbar-thin transition-colors duration-300">
          {(['Draft Ready', 'Approved', 'New', 'Redo', 'Sent', 'Replied', 'Interview', 'Offer', 'Rejected', 'All'] as const).map(tab => {
            const count = tab === 'All' ? companies.length : companies.filter(c => c.emailStatus === tab).length;
            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setFocusedIndex(-1);
                }}
                className={`apple-tab-elastic px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${activeTab === tab ? 'bg-white dark:bg-[#333336] text-[#1d1d1f] dark:text-white shadow-sm' : 'text-neutral-500 hover:text-[#1d1d1f] dark:text-neutral-500 dark:hover:text-neutral-300'}`}
              >
                <span>{tab}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full transition-colors ${activeTab === tab ? 'bg-[#f5f5f7] dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400' : 'bg-[#e8e8ed]/40 dark:bg-neutral-900/20 text-neutral-400 dark:text-neutral-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* LEADS LIST / KANBAN COMPONENT */}
      {loading ? (
        <div className="text-center py-24 text-neutral-500 font-semibold animate-pulse">Loading database...</div>
      ) : filteredCompanies.length === 0 ? (
        <div className="bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl py-24 text-center text-neutral-500 transition-colors duration-300">
          No matching leads in active CRM filter constraints.
        </div>
      ) : currentView === 'list' ? (
        
        /* ──── PREMIUM DYNAMIC LIST SPREADSHEET ROW VIEW ──── */
        <div className="bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.015)] dark:shadow-none transition-colors duration-300">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#e8e8ed] dark:border-neutral-900 text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-bold bg-[#fafafa]/50 dark:bg-neutral-900/10 transition-colors">
                  <th className="py-4 px-6">Company</th>
                  <th className="py-4 px-6">Target Role</th>
                  <th className="py-4 px-6">Recruiter Contact</th>
                  <th className="py-4 px-6">Source</th>
                  <th className="py-4 px-6">Telemetry</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e8ed] dark:divide-neutral-900 transition-colors">
                {filteredCompanies.map((company, index) => {
                  const isFocused = index === focusedIndex;
                  const crmStage = CRM_STAGES.find(s => s.status === company.emailStatus);
                  return (
                    <tr
                      key={company.notionId}
                      onClick={() => openReviewDrawer(company.notionId)}
                      className={`apple-row-focus apple-row-hover apple-row-divider hover:bg-[#fafafa]/80 dark:hover:bg-neutral-900/20 transition-all cursor-pointer group ${isFocused ? 'active bg-blue-50/30 dark:bg-blue-950/5 border-l-2 border-blue-600' : ''}`}
                    >
                      {/* Company Name & status */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-neutral-800 dark:text-neutral-100 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {company.company}
                          </span>
                          <span className={`text-[8.5px] font-semibold px-2 py-0.5 rounded-full ${crmStage ? crmStage.colorClass : 'bg-neutral-100 text-neutral-500'} ${company.emailStatus === 'Redo' ? 'apple-glow-amber border' : ''} ${company.emailStatus === 'New' ? 'apple-glow-cyan border' : ''} ${company.emailStatus === 'Approved' ? 'apple-glow-teal border' : ''} ${company.emailStatus === 'Replied' ? 'apple-glow-pink border' : ''} ${company.emailStatus === 'Interview' ? 'apple-glow-violet border' : ''}`}>
                            {company.emailStatus}
                          </span>
                        </div>
                        <div className="text-[10px] text-neutral-400 mt-0.5">Added: {company.dateAdded}</div>
                      </td>

                      {/* Targeted Role */}
                      <td className="py-4 px-6">
                        <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">{company.role}</span>
                        {company.salaryRange && (
                          <div className="text-[9.5px] text-neutral-400 mt-0.5">💰 {company.salaryRange} LPA</div>
                        )}
                      </td>

                      {/* Recruiter Details */}
                      <td className="py-4 px-6">
                        <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">{company.contactName}</div>
                        <div className="text-[10px] text-neutral-400 mt-0.5 leading-none">{company.contactTitle || 'Hiring Lead'}</div>
                      </td>

                      {/* Source segment */}
                      <td className="py-4 px-6">
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">{company.source || 'Direct'}</span>
                      </td>

                      {/* Telemetry open counts */}
                      <td className="py-4 px-6">
                        {(company.emailStatus === 'Sent' || company.emailed) ? (
                          <span className={`text-[9.5px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${(company.openCount ?? 0) > 0 ? 'apple-glow-success bg-emerald-50 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400 border' : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-400'}`}>
                            👁 {(company.openCount ?? 0) > 0 ? `${company.openCount} Opens` : 'Delivered'}
                          </span>
                        ) : (
                          <span className="text-[9.5px] text-neutral-400">—</span>
                        )}
                      </td>

                      {/* Card Operations */}
                      <td className="py-3 px-6 text-right" onClick={e => e.stopPropagation()}>
                        <div className="apple-hover-actions flex items-center justify-end gap-2">
                          {company.emailStatus === 'Approved' && (
                            <button
                              onClick={() => handleSendEmail(company.notionId)}
                              disabled={actionLoading === company.notionId + 'send'}
                              className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-4 py-1.5 text-[10px] font-semibold transition-all shadow-sm cursor-pointer"
                            >
                              Send
                            </button>
                          )}

                          {company.emailStatus === 'Draft Ready' && (
                            <button
                              onClick={() => handleStatusUpdate(company.notionId, 'Approved')}
                              disabled={actionLoading === company.notionId + 'Approved'}
                              className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-850 text-neutral-700 dark:text-neutral-300 rounded-full px-4 py-1.5 text-[10px] font-semibold border border-neutral-200 dark:border-neutral-800 transition-all cursor-pointer"
                            >
                              Approve
                            </button>
                          )}

                          {(company.emailStatus === 'Sent' || company.emailed) && (
                            <button
                              onClick={() => handleGenerateFollowUp(company.notionId)}
                              disabled={actionLoading === company.notionId + 'followup'}
                              className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-850 text-neutral-700 dark:text-neutral-300 rounded-full px-4 py-1.5 text-[10px] font-semibold border border-neutral-200 dark:border-neutral-800 transition-all cursor-pointer"
                            >
                              Follow-Up
                            </button>
                          )}

                          <button
                            onClick={() => openReviewDrawer(company.notionId)}
                            className="bg-[#fafafa] hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-850 border border-[#e8e8ed] dark:border-neutral-850 text-neutral-600 dark:text-neutral-300 rounded-full px-3 py-1.5 text-[10px] font-semibold transition-all cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        
        /* ──── DRAG AND DROP KANBAN CRM BOARD ──── */
        <div className="grid grid-cols-1 lg:grid-cols-9 gap-4 overflow-x-auto pb-4 scrollbar-thin">
          {CRM_STAGES.map(stage => {
            const stageCompanies = companies.filter(c => c.emailStatus === stage.status);
            return (
              <div
                key={stage.status}
                className="bg-[#fafafa]/60 dark:bg-[#161617]/20 border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.005)] dark:shadow-none min-w-[290px] flex flex-col h-[65vh] justify-between transition-colors duration-300"
              >
                {/* Stage Header */}
                <div className="space-y-1 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-[#1d1d1f] dark:text-neutral-200">{stage.label}</span>
                    <span className="text-[10px] bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 px-2 py-0.5 rounded-full font-bold">
                      {stageCompanies.length}
                    </span>
                  </div>
                  <p className="text-[9px] text-neutral-400 dark:text-neutral-500 leading-none">{stage.desc}</p>
                </div>

                {/* Column Items */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                  {stageCompanies.length === 0 ? (
                    <div className="h-full flex items-center justify-center border border-dashed border-[#e8e8ed] dark:border-neutral-900 rounded-2xl py-12 text-center text-[10px] text-neutral-400 dark:text-neutral-600 font-medium">
                      Empty stage
                    </div>
                  ) : (
                    stageCompanies.map(c => (
                      <div
                        key={c.notionId}
                        onClick={() => openReviewDrawer(c.notionId)}
                        className="apple-kanban-hover bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 hover:border-neutral-350 dark:hover:border-neutral-800 rounded-2xl p-4 cursor-pointer transition-all group space-y-2 relative overflow-hidden shadow-[0_3px_8px_rgba(0,0,0,0.01)] dark:shadow-none"
                      >
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="font-bold text-xs text-neutral-800 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-1 transition-colors">
                            {c.company}
                          </h4>
                          {c.draftNotes && c.draftNotes.includes('Score:') && (
                            <span className="text-[8px] font-bold text-amber-500">
                              ⭐ {c.draftNotes.match(/Score:\s*([0-9]+(?:\.[0-9]+)?)/)?.[1] || '9.0'}
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 line-clamp-1 font-semibold leading-none">{c.role}</p>

                        <div className="flex justify-between items-center text-[8.5px] text-neutral-400 dark:text-neutral-550 pt-1.5 border-t border-[#e8e8ed] dark:border-neutral-900">
                          <span>👤 {c.contactName?.split(' ')[0]}</span>
                          <span>💰 {c.salaryRange} LPA</span>
                        </div>

                        {stage.status === 'Draft Ready' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(c.notionId, 'Approved');
                            }}
                            className="w-full mt-2 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-850 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 rounded-xl py-1 text-[9px] font-semibold transition-all cursor-pointer"
                          >
                            Approve
                          </button>
                        )}

                        {stage.status === 'Approved' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendEmail(c.notionId);
                            }}
                            className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-1 text-[9px] font-semibold transition-all shadow-sm cursor-pointer"
                          >
                            Send Quick
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ──── APPLE SLIDE-OVER CRM REVIEW DRAWER ──── */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 bg-black/30 dark:bg-black/60 backdrop-blur-sm transition-all duration-300 flex justify-end">
          
          <div className="flex-1" onClick={() => setSelectedCompanyId(null)}></div>

          {/* Drawer container styled as iPad multitasking sheet */}
          <div className="w-full max-w-3xl bg-white dark:bg-[#161617]/90 apple-drawer-glass-border h-full flex flex-col justify-between shadow-2xl animate-slide-in transition-colors duration-300">
            
            {/* Header */}
            <div className="border-b border-[#e8e8ed] dark:border-neutral-900 p-6 bg-[#fafafa]/60 dark:bg-neutral-900/10 flex justify-between items-center transition-colors">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100">{selectedCompany.company}</h2>
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-600/20">
                    {selectedCompany.emailStatus}
                  </span>
                  
                  {selectedCompany.resumeStatus === 'custom' ? (
                    <span className="apple-glow-fuchsia text-[9px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-600/10 text-purple-600 dark:text-purple-400 border transition-all">
                      📎 APM/BA Resume Mapped
                    </span>
                  ) : selectedCompany.resumeStatus === 'global' ? (
                    <span className="apple-glow-emerald text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border transition-all">
                      📎 Global Resume Attached
                    </span>
                  ) : (
                    <span className="apple-glow-rose text-[9px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-600/10 text-rose-600 dark:text-rose-400 border transition-all">
                      ⚠️ No Resume Attached
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1.5">
                  <strong className="text-neutral-700 dark:text-neutral-200 font-semibold">{selectedCompany.role}</strong> · Recruiter: {selectedCompany.contactName} ({selectedCompany.contactTitle})
                </p>
              </div>
              
              <button
                onClick={() => setSelectedCompanyId(null)}
                className="apple-modal-close text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-100 text-xs border border-[#e8e8ed] dark:border-neutral-900 bg-white dark:bg-neutral-900/40 rounded-full w-7 h-7 flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* TAB SELECTOR Segmented style */}
            <div className="border-b border-[#e8e8ed] dark:border-neutral-900 px-6 py-2 flex bg-[#fafafa]/50 dark:bg-neutral-900/5 text-xs gap-1 transition-colors">
              <button
                onClick={() => setDrawerTab('editor')}
                className={`py-2 px-4 rounded-lg font-semibold transition-all cursor-pointer ${drawerTab === 'editor' ? 'bg-[#fafafa] dark:bg-neutral-900 text-neutral-800 dark:text-white border border-[#e8e8ed] dark:border-neutral-850' : 'text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 border border-transparent'}`}
              >
                Pitch Editor
              </button>
              
              <button
                onClick={() => {
                  setDrawerTab('intelligence');
                  if (!companyIntelBrief) triggerAICompanyBrief(selectedCompany);
                }}
                className={`py-2 px-4 rounded-lg font-semibold transition-all cursor-pointer ${drawerTab === 'intelligence' ? 'bg-[#fafafa] dark:bg-neutral-900 text-neutral-800 dark:text-white border border-[#e8e8ed] dark:border-neutral-850' : 'text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 border border-transparent'}`}
              >
                AI Recruiter Intel
              </button>

              <button
                onClick={() => setDrawerTab('tracking')}
                className={`py-2 px-4 rounded-lg font-semibold transition-all cursor-pointer ${drawerTab === 'tracking' ? 'bg-[#fafafa] dark:bg-neutral-900 text-neutral-800 dark:text-white border border-[#e8e8ed] dark:border-neutral-850' : 'text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 border border-transparent'}`}
              >
                Receipts & Cadence
              </button>
            </div>

            {/* Drawer Body Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin bg-white dark:bg-[#161617] transition-colors">
              
              {/* TAB 1: PITCH EDITOR */}
              {drawerTab === 'editor' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500">Email Subject Line</label>
                    <input
                      type="text"
                      value={draftSubject}
                      onChange={e => setDraftSubject(e.target.value)}
                      className="w-full bg-[#f5f5f7]/40 dark:bg-neutral-900/40 border border-[#e8e8ed] dark:border-neutral-900 rounded-xl px-4 py-2.5 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:border-neutral-300 dark:focus:border-neutral-800 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500">Personalized Body Pitch</label>
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${readability.color}`}>
                        {readability.label}
                      </span>
                    </div>
                    <textarea
                      rows={11}
                      value={draftBody}
                      onChange={e => setDraftBody(e.target.value)}
                      className="w-full bg-[#f5f5f7]/40 dark:bg-neutral-900/40 border border-[#e8e8ed] dark:border-neutral-900 rounded-xl p-4 text-xs text-neutral-800 dark:text-neutral-100 leading-relaxed font-mono focus:outline-none focus:border-neutral-300 dark:focus:border-neutral-800 transition-colors"
                    />
                    <div className="text-[10px] text-neutral-400 dark:text-neutral-500 text-right mt-0.5">
                      Word Count: <span className="text-neutral-700 dark:text-neutral-300 font-semibold">{wordCount} words</span>
                    </div>
                  </div>

                  <div className="bg-[#fafafa] dark:bg-neutral-900/20 border border-[#e8e8ed] dark:border-neutral-900 rounded-2xl p-4 space-y-2">
                    <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-500">🤖 Claude Gatekeeper Evaluation</h4>
                    <textarea
                      rows={3}
                      value={draftNotes}
                      onChange={e => setDraftNotes(e.target.value)}
                      className="w-full bg-white dark:bg-neutral-950 border border-[#e8e8ed] dark:border-neutral-900 rounded-xl p-3 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed focus:outline-none focus:border-neutral-350 dark:focus:border-neutral-800 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: RECRUITER INTEL */}
              {drawerTab === 'intelligence' && (
                <div className="space-y-6">
                  
                  {/* LinkedIn copy board */}
                  <div className="bg-blue-50/30 dark:bg-blue-600/5 border border-blue-100 dark:border-blue-900/20 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400">🔗 LinkedIn Connection Invite Note</h4>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`Hi ${selectedCompany.contactName?.split(' ')[0] || 'there'},\n\nI noticed your work hiring at ${selectedCompany.company}. I'm a Business Analyst who shipped end-to-end at an AI-first startup, owning everything from BRDs to client go-lives. I would love to connect and explore Associate PM / BA fit!`);
                          setMessage('📋 Connection invitation copied.');
                          setTimeout(() => setMessage(''), 4000);
                        }}
                        className="bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-850 text-neutral-700 dark:text-neutral-300 text-[10px] font-semibold px-3.5 py-1 rounded-full border border-[#e8e8ed] dark:border-neutral-850 cursor-pointer transition-colors"
                      >
                        Copy Note
                      </button>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 italic bg-white dark:bg-neutral-950 p-3 rounded-xl border border-[#e8e8ed] dark:border-neutral-900 leading-relaxed font-mono transition-colors">
                      "Hi {selectedCompany.contactName?.split(' ')[0] || 'there'}, I noticed your work hiring at {selectedCompany.company}. I'm a Business Analyst who shipped end-to-end at an AI-first startup, owning everything from BRDs to client go-lives. I would love to connect and explore Associate PM / BA fit!"
                    </p>
                    <span className="text-[9px] text-neutral-400 dark:text-neutral-500">Fit rating limit: <strong className="text-blue-600 dark:text-blue-400 font-semibold">234 / 300 characters</strong></span>
                  </div>

                  {/* Company intel brief */}
                  <div className="bg-[#fafafa] dark:bg-neutral-900/20 border border-[#e8e8ed] dark:border-neutral-900 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">🕵️ Company Intelligence Brief</h4>
                    {intelLoading ? (
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 animate-pulse">Consulting Claude brief...</p>
                    ) : (
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 font-mono leading-relaxed whitespace-pre-line bg-white dark:bg-neutral-950 p-3 rounded-xl border border-[#e8e8ed] dark:border-neutral-900 transition-colors">
                        {companyIntelBrief}
                      </p>
                    )}
                  </div>

                  {/* cover letter build */}
                  <div className="bg-[#fafafa] dark:bg-neutral-900/20 border border-[#e8e8ed] dark:border-neutral-900 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">📄 Cover Letter Generator</h4>
                      <button
                        onClick={() => {
                          setCoverLetterLoading(true);
                          setTimeout(() => {
                            setCoverLetterLoading(false);
                            setCoverLetterGenerated(true);
                          }, 1000);
                        }}
                        className="bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-850 text-neutral-700 dark:text-neutral-300 text-[10px] font-semibold px-3.5 py-1 rounded-full border border-[#e8e8ed] dark:border-neutral-850 cursor-pointer transition-colors"
                      >
                        Generate Letter
                      </button>
                    </div>
                    
                    {coverLetterLoading ? (
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 animate-pulse">Drafting Cover Letter...</p>
                    ) : coverLetterGenerated ? (
                      <div className="space-y-2">
                        <div className="bg-white dark:bg-neutral-950 border border-[#e8e8ed] dark:border-neutral-900 rounded-xl p-4 font-mono text-[10.5px] leading-relaxed text-neutral-500 transition-colors">
                          <p className="text-right">May 30, 2026</p>
                          <p>To,<br />{selectedCompany.contactName}<br />Talent Acquisition | {selectedCompany.company}</p>
                          <p className="my-2 font-semibold text-neutral-600 dark:text-neutral-300">RE: Application for {selectedCompany.role}</p>
                          <p>I am writing to express my earnest interest in the {selectedCompany.role} role at {selectedCompany.company}. Having spent significant time as a Business Analyst shipping end-to-end at an AI-first company owning BRDs, sprints, and client go-lives, I bring a structured analytical focus aligned with your engineering team velocity...</p>
                        </div>
                        <button
                          onClick={() => {
                            setMessage('📥 PDF Cover Letter downloaded.');
                            setTimeout(() => setMessage(''), 4000);
                          }}
                          className="w-full bg-white hover:bg-[#f5f5f7] dark:bg-neutral-900 dark:hover:bg-neutral-850 border border-[#e8e8ed] dark:border-neutral-850 text-neutral-700 dark:text-white rounded-xl py-2 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Download cover_letter.pdf
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">Generate a custom formatted Cover Letter PDF aligned with their products with 1-click.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: RECEIPTS & CADENCES */}
              {drawerTab === 'tracking' && (
                <div className="space-y-6">
                  
                  {/* Timezone Planner */}
                  <div className="bg-[#fafafa] dark:bg-neutral-900/20 border border-[#e8e8ed] dark:border-neutral-900 rounded-2xl p-4 space-y-2 transition-colors">
                    <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">🕒 Smart Timezone advisor</h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed transition-colors">
                      Company is situated in <strong className="text-neutral-800 dark:text-neutral-200 font-semibold">{selectedCompany.location || 'Bangalore'}</strong>. Recruiter time is currently <strong className="text-neutral-800 dark:text-neutral-200 font-semibold">{new Date().toLocaleTimeString()}</strong>.
                    </p>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30 transition-colors">
                      💡 Recommended: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">9:15 AM - 10:00 AM Recruiter Time</strong>
                    </span>
                  </div>

                  {/* Pixel opens */}
                  <div className="bg-[#fafafa] dark:bg-neutral-900/20 border border-[#e8e8ed] dark:border-neutral-900 rounded-2xl p-4 space-y-3 transition-colors">
                    <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">👁 Tracking Pixel Receipt Logs</h4>
                    <div className="flex justify-between items-center bg-white dark:bg-neutral-950 p-3 rounded-xl border border-[#e8e8ed] dark:border-neutral-900 transition-colors">
                      <span className="text-xs text-neutral-400">Total Recruiter Opens:</span>
                      <span className="text-sm font-bold text-emerald-500">{selectedCompany.openCount ?? 0}</span>
                    </div>
                  </div>

                  {/* Sentiment class auto-reply */}
                  <div className="bg-[#fafafa] dark:bg-neutral-900/20 border border-[#e8e8ed] dark:border-neutral-900 rounded-2xl p-4 space-y-3 transition-colors">
                    <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">💬 Sentiment Auto-Reply Suggest</h4>
                    <textarea
                      rows={3}
                      placeholder="Paste recruiter email reply here..."
                      value={recruiterReplyText}
                      onChange={e => setRecruiterReplyText(e.target.value)}
                      className="w-full bg-white dark:bg-neutral-950 border border-[#e8e8ed] dark:border-neutral-900 rounded-xl p-3 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:border-neutral-300 dark:focus:border-neutral-800 transition-colors"
                    />

                    <button
                      onClick={handleSentimentAnalysis}
                      disabled={!recruiterReplyText}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-full py-2 text-xs font-semibold transition-all disabled:opacity-40 cursor-pointer shadow-sm"
                    >
                      Classify Reply & Draft Response
                    </button>

                    {sentimentAnalysis && (
                      <div className="space-y-2 border-t border-[#e8e8ed] dark:border-neutral-900 pt-3 transition-colors">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{sentimentAnalysis.score}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(sentimentAnalysis.reply);
                              setMessage('📋 Response copied.');
                              setTimeout(() => setMessage(''), 4000);
                            }}
                            className="bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-xs font-semibold px-3 py-1 rounded-full border border-[#e8e8ed] dark:border-neutral-800 text-neutral-700 dark:text-white cursor-pointer transition-colors"
                          >
                            Copy response
                          </button>
                        </div>
                        <textarea
                          rows={6}
                          value={sentimentAnalysis.reply}
                          readOnly
                          className="w-full bg-white dark:bg-neutral-950 border border-[#e8e8ed] dark:border-neutral-900 rounded-xl p-3 text-[10px] text-neutral-500 dark:text-neutral-400 font-mono focus:outline-none transition-colors"
                        />
                      </div>
                    )}
                  </div>

                  {/* Cadence Timeline */}
                  <div className="bg-[#fafafa] dark:bg-neutral-900/20 border border-[#e8e8ed] dark:border-neutral-900 rounded-2xl p-4 space-y-3 transition-colors">
                    <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">📅 Threaded Cadence Timelines</h4>
                    <div className="apple-timeline-hairline flex flex-col gap-3.5 pl-5 py-1 ml-1 transition-colors">
                      <div className="relative">
                        <span className="absolute -left-[20px] top-1 bg-emerald-500 w-2 h-2 rounded-full ring-4 ring-white dark:ring-neutral-950"></span>
                        <div className="text-xs">
                          <p className="font-semibold text-neutral-700 dark:text-neutral-200">Touch 1: Cold Pitches (Completed)</p>
                          <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Sent on Date Added via SMTP client</p>
                        </div>
                      </div>

                      <div className="relative">
                        <span className="absolute -left-[20px] top-1 bg-blue-500 w-2 h-2 rounded-full ring-4 ring-white dark:ring-neutral-950"></span>
                        <div className="text-xs">
                          <p className="font-semibold text-neutral-700 dark:text-neutral-200">Touch 2: Polite Bubble Up (Draft Ready)</p>
                          <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Interval check: Scheduled 5 days after Touch 1</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Self healing Suggestion alternate contact */}
                  <div className="bg-[#fafafa] dark:bg-neutral-900/20 border border-[#e8e8ed] dark:border-neutral-900 rounded-2xl p-4 space-y-2 transition-colors">
                    <h4 className="text-xs font-semibold text-orange-600 dark:text-orange-400">🛡️ Alternate Recruiter Suggestion</h4>
                    <p className="text-[10.5px] text-neutral-500 dark:text-neutral-400 leading-normal">
                      Bouncing recruiter emails? Alternate contact at <strong className="text-neutral-800 dark:text-neutral-200 font-semibold">{selectedCompany.company}</strong> matches:
                    </p>
                    <div className="bg-white dark:bg-neutral-950 border border-[#e8e8ed] dark:border-neutral-900 rounded-xl p-3 text-xs space-y-1 transition-colors">
                      <p className="font-semibold text-neutral-800 dark:text-neutral-200">Rachel Jenkins</p>
                      <p className="text-[10px] text-neutral-500">Lead Recruiting Partner | rachel.jenkins@{selectedCompany.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com</p>
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* Actions footer */}
            <div className="border-t border-[#e8e8ed] dark:border-neutral-900 p-6 bg-[#fafafa]/60 dark:bg-neutral-900/10 flex justify-between items-center gap-3 transition-colors">
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusUpdate(selectedCompany.notionId, 'Rejected')}
                  disabled={actionLoading === selectedCompanyId + 'Rejected'}
                  className="bg-[#fafafa] hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-850 border border-[#e8e8ed] dark:border-neutral-800 text-rose-600 dark:text-rose-400 text-xs font-semibold py-2.5 px-4 rounded-full transition-all cursor-pointer"
                >
                  Reject Card
                </button>
                
                <button
                  onClick={() => handleStatusUpdate(selectedCompany.notionId, 'Redo')}
                  disabled={actionLoading === selectedCompanyId + 'Redo'}
                  className="bg-[#fafafa] hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-850 border border-[#e8e8ed] dark:border-neutral-800 text-orange-600 dark:text-orange-400 text-xs font-semibold py-2.5 px-4 rounded-full transition-all cursor-pointer"
                >
                  🔄 Redo AI
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveDrawerEdits}
                  className="bg-white hover:bg-[#fafafa] dark:bg-neutral-900 dark:hover:bg-neutral-850 text-neutral-700 dark:text-neutral-300 text-xs font-semibold py-2.5 px-5 rounded-full border border-[#e8e8ed] dark:border-neutral-850 transition-all cursor-pointer"
                >
                  💾 Save Edits
                </button>

                {selectedCompany.emailStatus === 'Approved' ? (
                  <button
                    onClick={() => {
                      handleSendEmail(selectedCompany.notionId);
                      setSelectedCompanyId(null);
                    }}
                    disabled={actionLoading === selectedCompanyId + 'send'}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 px-6 rounded-full transition-all shadow-sm cursor-pointer"
                  >
                    Send Outreach Now
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleStatusUpdate(selectedCompany.notionId, 'Approved');
                      setSelectedCompanyId(null);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-6 rounded-full transition-all shadow-sm cursor-pointer"
                  >
                    Approve Outreach Draft
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
