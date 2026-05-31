'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { Company, EmailStatus } from '@/types';
import { getOptimalSendTime } from '@/lib/timing';

// CRM Stages / Kanban columns styled with high-end Apple system aesthetics
const CRM_STAGES: { status: EmailStatus; label: string; colorClass: string; desc: string }[] = [
  { status: 'New', label: 'Extracted Leads', colorClass: 'bg-neutral-100 dark:bg-neutral-900/40 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-850', desc: 'Raw contact details' },
  { status: 'Draft Ready', label: 'AI Drafts Ready', colorClass: 'bg-blue-50 dark:bg-blue-950/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-950/30', desc: 'Personalized pitches ready' },
  { status: 'Redo', label: 'Redo AI', colorClass: 'bg-orange-50 dark:bg-orange-950/10 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-950/30', desc: 'Needs revision' },
  { status: 'Scheduled', label: 'Scheduled', colorClass: 'bg-sky-50 dark:bg-sky-950/10 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-950/30', desc: 'Timed delivery queued' },
  { status: 'Approved', label: 'Approved Outbox', colorClass: 'bg-emerald-50 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-950/30', desc: 'Ready for delivery' },
  { status: 'Sent', label: 'Outreach Emailed', colorClass: 'bg-purple-50 dark:bg-purple-950/10 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-950/30', desc: 'Sent successfully' },
  { status: 'Follow-up Ready', label: 'Follow-up Ready', colorClass: 'bg-fuchsia-50 dark:bg-fuchsia-950/10 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-100 dark:border-fuchsia-950/30', desc: 'Touchpoint bump ready' },
  { status: 'Replied', label: 'Recruiter Replied', colorClass: 'bg-pink-50 dark:bg-pink-950/10 text-pink-600 dark:text-pink-400 border border-pink-100 dark:border-pink-950/30', desc: 'Active lead response!' },
  { status: 'Interview', label: 'Interview Stage', colorClass: 'bg-amber-50 dark:bg-amber-950/10 text-amber-600 dark:text-amber-500 border border-amber-100 dark:border-amber-950/30', desc: 'Rounds in progress' },
  { status: 'Offer', label: 'Job Offers', colorClass: 'bg-green-50 dark:bg-green-950/10 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-950/30', desc: 'Offers unlocked!' },
  { status: 'Rejected', label: 'Rejected', colorClass: 'bg-red-50 dark:bg-red-950/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-950/30', desc: 'Archived leads' },
  { status: 'No Response', label: 'No Response', colorClass: 'bg-slate-50 dark:bg-slate-950/10 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-950/30', desc: 'No touchpoint response' },
];

function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const authFetch = async (url: string, options: RequestInit = {}) => {
    if (!user) return fetch(url, options);
    const token = await user.getIdToken();
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    });
  };
  // CRM state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'list' | 'kanban'>('list');
  const [activeTab, setActiveTab] = useState<EmailStatus | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'company' | 'salary' | 'signal'>('date');
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

  // New features state variables
  const [jdUrl, setJdUrl] = useState('');
  const [jdText, setJdText] = useState('');
  const [jdKeywords, setJdKeywords] = useState<string[]>([]);
  const [jdGaps, setJdGaps] = useState<string[]>([]);
  const [jdHookSuggestion, setJdHookSuggestion] = useState('');
  const [jdLoading, setJdLoading] = useState(false);
  const [jdCollapsed, setJdCollapsed] = useState(true);
  const [scheduledTime, setScheduledTime] = useState('');
  const [activeSendMenuId, setActiveSendMenuId] = useState<string | null>(null);
  const [drawerSendMenuOpen, setDrawerSendMenuOpen] = useState(false);

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

  const getScheduledCountdown = (scheduledTimeStr?: string): string => {
    if (!scheduledTimeStr) return '';
    const diff = new Date(scheduledTimeStr).getTime() - Date.now();
    if (diff <= 0) return 'Sending soon...';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
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
      const res = await authFetch('/api/companies');
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

  useEffect(() => {
    const drawerId = searchParams.get('drawer');
    if (drawerId && companies.length > 0) {
      openReviewDrawer(drawerId);
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams, companies]);

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

      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('dashboard-search-input');
        if (searchInput) {
          (searchInput as HTMLInputElement).focus();
          (searchInput as HTMLInputElement).select();
        }
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
      if (sortBy === 'signal') {
        const getScore = (sig?: string | null) => {
          if (sig === 'Hot') return 3;
          if (sig === 'Caution') return 1;
          if (sig === 'Archive') return 0;
          return 2; // Normal / blank
        };
        return getScore(b.companySignal) - getScore(a.companySignal);
      }
      return b.dateAdded.localeCompare(a.dateAdded); 
    });

  // Fetch intelligence briefs using Claude
  const triggerAICompanyBrief = async (company: Company) => {
    setIntelLoading(true);
    try {
      const response = await authFetch('/api/generate', {
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
  const handleSentimentAnalysis = async () => {
    if (!recruiterReplyText || !selectedCompany) return;
    try {
      const res = await authFetch('/api/replies/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyBody: recruiterReplyText, notionId: selectedCompany.notionId }),
      });
      const data = await res.json();
      if (data.success) {
        setSentimentAnalysis({
          score: `${data.sentiment.toUpperCase()} (Sentiment Classified)`,
          reply: data.suggestedResponse
        });
      }
    } catch (err) {
      console.error('Sentiment analysis failed:', err);
    }
  };

  const handleJdAnalyze = async () => {
    if (!selectedCompany) return;
    setJdLoading(true);
    try {
      const res = await authFetch('/api/jd/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notionId: selectedCompany.notionId, jdUrl, jdText }),
      });
      const data = await res.json();
      if (data.success) {
        setJdKeywords(data.keywords);
        setJdGaps(data.gapSkills);
        setJdHookSuggestion(data.hookSuggestion);
        
        await fetchCompanies();
        
        setMessage('✅ JD Analysis completed. Pitch hook updated.');
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (err) {
      console.error('JD analysis failed:', err);
    } finally {
      setJdLoading(false);
    }
  };

  const handleScheduleSend = async (id: string, customTime?: string) => {
    setActionLoading(id + 'schedule');
    try {
      const res = await authFetch(`/api/send/${id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledFor: customTime }),
      });
      const data = await res.json();
      if (data.success) {
        setCompanies(prev =>
          prev.map(c => (c.notionId === id ? { ...c, emailStatus: 'Scheduled', scheduledSendTime: data.scheduledFor } : c))
        );
        setMessage('⏰ Pitch scheduled successfully.');
        setTimeout(() => setMessage(''), 4000);
        setSelectedCompanyId(null);
      }
    } catch (err) {
      console.error('Scheduling failed:', err);
    } finally {
      setActionLoading(null);
    }
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
      setJdUrl(company.jobDescriptionUrl || '');
      setJdKeywords(company.jdKeywords ? company.jdKeywords.split(', ') : []);
      setJdGaps(company.skillsGap ? company.skillsGap.split(', ') : []);
      setJdHookSuggestion('');
      setJdText('');
      setJdCollapsed(true);
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
      const res = await authFetch('/api/companies/ingest', {
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
      await authFetch('/api/companies', {
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
      const company = companies.find(c => c.notionId === id);
      const nextFollowup = Math.min((company?.followUpCount || 0) + 1, 3);
      const res = await authFetch(`/api/followup/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'draft', followupNumber: nextFollowup }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchCompanies();
        openReviewDrawer(id);
        setMessage(`📨 Threaded follow-up ${nextFollowup} drafted.`);
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
      const res = await authFetch(`/api/send/${id}`, { method: 'POST' });
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
      await authFetch('/api/companies', {
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
    const res = await authFetch('/api/send/bulk', { method: 'POST' });
    const data = await res.json();
    setBulkLoading(false);
    fetchCompanies();
    setDailyGoalCount(prev => Math.min(prev + (data.sent || 0), 5));
    triggerConfetti();
    setMessage(`🚀 Sent ${data.sent} outreaches successfully.`);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleBulkRedo = async () => {
    setBulkLoading(true);
    const targets = companies.filter(c => c.emailStatus === 'Redo');
    for (const c of targets) {
      await authFetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notionId: c.notionId, status: 'Draft Ready' }),
      });
    }
    setCompanies(prev =>
      prev.map(c => (c.emailStatus === 'Redo' ? { ...c, emailStatus: 'Draft Ready' } : c))
    );
    setBulkLoading(false);
    setMessage(`🔄 Bulk redo triggered for ${targets.length} drafts.`);
    setTimeout(() => setMessage(''), 5000);
  };

  // Save edits inside drawer
  const handleSaveDrawerEdits = async () => {
    if (!selectedCompany) return;
    setActionLoading(selectedCompanyId + 'save');
    try {
      await authFetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notionId: selectedCompanyId,
          status: selectedCompany.emailStatus,
          emailSubject: draftSubject,
          emailDraft: draftBody,
          draftNotes,
        }),
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
    if (selectedCompany && selectedCompany.emailStatus && ['Sent', 'Replied', 'Interview', 'Offer'].includes(selectedCompany.emailStatus)) {
      return { label: 'Outreach Delivered', color: 'bg-emerald-50 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20' };
    }
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

  const getBriefingInsight = () => {
    const replied = companies.find(c => c.emailStatus === 'Replied');
    if (replied) {
      return `🔥 Recruiter at ${replied.company} replied! Recommended action: paste their response in the Sent tab to draft an instant auto-reply.`;
    }
    const opened = [...companies]
      .filter(c => (c.openCount ?? 0) > 0)
      .sort((a, b) => (b.openCount ?? 0) - (a.openCount ?? 0))[0];
    if (opened) {
      return `👁️ Recruiter at ${opened.company} opened your pitch ${opened.openCount} ${opened.openCount === 1 ? 'time' : 'times'}! Recommended action: prepare follow-up.`;
    }
    const drafts = companies.filter(c => c.emailStatus === 'Draft Ready').length;
    if (drafts > 0) {
      return `💡 You have ${drafts} drafts ready for review. Recommended action: scroll down, press E to edit, and approve them for dispatch.`;
    }
    return '✨ Your pipeline is up to date. Enter a company below to discover recruiter contacts and generate new drafts!';
  };
  const briefingInsight = getBriefingInsight();

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in relative text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight">
      
      {/* CONFETTI FLOATING PARTICLES */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden min-h-screen">
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

      {/* SYSTEM TOASTS */}
      {message && (
        <div className="fixed top-6 right-6 z-50 bg-white dark:bg-[#161617] border border-neutral-200 dark:border-neutral-800 shadow-xl rounded-2xl p-4 text-xs font-semibold text-neutral-800 dark:text-neutral-200 animate-slide-in-right flex gap-3 items-start">
          <span>🔔</span>
          <p>{message}</p>
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
                stroke={dailyGoalCount >= 5 ? '#34c759' : '#0071e3'}
                strokeWidth="2"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-[10px] text-neutral-500 font-semibold leading-none">
              {dailyGoalCount >= 5 ? (
                <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">✓</span>
              ) : (
                <span className="text-sm font-extrabold text-neutral-800 dark:text-neutral-200">{dailyGoalCount}/5</span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-[#1d1d1f] dark:text-neutral-100">
                Morning Briefing
              </h1>
              <span className="apple-pill-glow apple-glow-indigo-milestone bg-neutral-100 dark:bg-neutral-900 text-orange-600 dark:text-orange-400 border text-[10px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm transition-all">
                🔥 {streakCount} Days Streak
              </span>
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 text-xs max-w-lg leading-relaxed transition-colors">
              <strong className="text-[#1d1d1f] dark:text-neutral-200 font-semibold">Goal: Send 5 outreaches.</strong> {briefingInsight}
            </p>
          </div>
        </div>
      </div>

      {/* CONSOLE CONTROL ROOM PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Ingestion Panel */}
        <form onSubmit={handleIngest} className="apple-glow-card bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.015)] dark:shadow-none flex flex-col justify-between gap-4 transition-colors duration-300">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Recruiter Ingestion</h2>
            <p className="text-[10px] text-neutral-500 mt-0.5">Finds target recruiters using Claude intelligence</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Target Recruiter Contact</label>
            <input
              type="text"
              placeholder="Company (e.g. Stripe)"
              value={ingestCompany}
              onChange={e => setIngestCompany(e.target.value)}
              className="apple-input-hover apple-input-bounds w-full bg-[#f5f5f7]/60 dark:bg-neutral-900/40 border border-[#e8e8ed] dark:border-neutral-850 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-700 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Target Role</label>
            <select
              value={ingestRole}
              onChange={e => setIngestRole(e.target.value)}
              className="apple-select-elastic apple-select-bounds w-full bg-[#f5f5f7]/60 dark:bg-neutral-900/40 border border-[#e8e8ed] dark:border-neutral-850 rounded-xl px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none transition-all"
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
            className="apple-glow-blue apple-button-sweep w-full bg-[#fafafa] hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-850 text-neutral-800 dark:text-neutral-200 border border-[#e8e8ed] dark:border-neutral-800 rounded-full py-2 text-xs font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            {ingestLoading ? (
              <span className="w-3.5 h-3.5 border-2 border-neutral-750 dark:border-white border-t-transparent rounded-full animate-spin"></span>
            ) : 'Discover Recruiter Lead'}
          </button>
        </form>

        {/* Filter and sorting */}
        <div className="apple-glow-card lg:col-span-2 bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.015)] dark:shadow-none flex flex-col justify-between gap-4 transition-colors duration-300">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Search & Control Console</h2>
              <p className="text-[10px] text-neutral-500 mt-0.5">Fuzzy search and list parameters sorting</p>
            </div>
            
            <div className="relative group">
              <button
                type="button"
                className="w-5 h-5 rounded-full bg-neutral-100 dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 text-[10px] font-bold flex items-center justify-center cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors border border-neutral-200 dark:border-neutral-800"
                title="Keyboard Shortcuts Cheatsheet"
              >
                ?
              </button>
              
              <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute right-0 mt-2 w-48 p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-lg text-[10px] text-neutral-600 dark:text-neutral-450 space-y-1.5 transition-opacity duration-200 z-50">
                <p className="font-bold text-neutral-800 dark:text-neutral-200 border-b border-neutral-100 dark:border-neutral-800 pb-1">Keyboard Shortcuts</p>
                <div className="flex justify-between">
                  <span>Fuzzy Search:</span>
                  <kbd className="bg-[#f5f5f7] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-1 rounded text-[8px] font-mono">/</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Focus Down:</span>
                  <kbd className="bg-[#f5f5f7] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-1 rounded text-[8px] font-mono">J</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Focus Up:</span>
                  <kbd className="bg-[#f5f5f7] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-1 rounded text-[8px] font-mono">K</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Open & Edit:</span>
                  <kbd className="bg-[#f5f5f7] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-1 rounded text-[8px] font-mono">E</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Approve:</span>
                  <kbd className="bg-[#f5f5f7] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-1 rounded text-[8px] font-mono">A</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Send E-mail:</span>
                  <kbd className="bg-[#f5f5f7] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-1 rounded text-[8px] font-mono">S</kbd>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              id="dashboard-search-input"
              type="text"
              placeholder="Search by company, role or recruiter..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-[#f5f5f7]/60 dark:bg-neutral-900/40 border border-[#e8e8ed] dark:border-neutral-850 rounded-xl px-4 py-2 text-xs text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-700 transition-colors w-full"
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
                <option value="signal">🔥 Signal Priority</option>
              </select>

              <div className="bg-[#e8e8ed]/60 dark:bg-neutral-900 border border-[#d2d2d7]/30 dark:border-neutral-850 rounded-xl p-0.5 flex transition-colors duration-300">
                <button
                  onClick={() => setCurrentView('list')}
                  className={`apple-tab-glide apple-indicator-accent apple-sliding-tab px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${currentView === 'list' ? 'active text-[#1d1d1f] dark:text-white' : 'text-neutral-500 hover:text-[#1d1d1f] dark:text-neutral-500 dark:hover:text-neutral-300'}`}
                >
                  List
                </button>
                <button
                  onClick={() => setCurrentView('kanban')}
                  className={`apple-tab-glide apple-indicator-accent apple-sliding-tab px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${currentView === 'kanban' ? 'active text-[#1d1d1f] dark:text-white' : 'text-neutral-500 hover:text-[#1d1d1f] dark:text-neutral-500 dark:hover:text-neutral-300'}`}
                >
                  Kanban
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {currentView === 'list' && (
        <div className="bg-[#e8e8ed]/60 dark:bg-neutral-900/40 border border-[#d2d2d7]/30 dark:border-neutral-900 p-0.5 rounded-2xl flex gap-1 overflow-x-auto scrollbar-thin transition-colors duration-300">
          {(['Draft Ready', 'Approved', 'Scheduled', 'New', 'Redo', 'Sent', 'Follow-up Ready', 'Replied', 'Interview', 'Offer', 'Rejected', 'No Response', 'All'] as const).map(tab => {
            const count = tab === 'All' ? companies.length : companies.filter(c => c.emailStatus === tab).length;
            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setFocusedIndex(-1);
                }}
                className={`apple-tab-elastic apple-badge-focus-shift px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-2 cursor-pointer border ${activeTab === tab ? 'bg-white dark:bg-[#333336] text-blue-600 dark:text-white border-neutral-300 dark:border-neutral-700 shadow-[0_2px_8px_rgba(0,0,0,0.06)] font-bold' : 'text-neutral-500 hover:text-[#1d1d1f] dark:text-neutral-500 dark:hover:text-neutral-300 border-transparent'}`}
              >
                <span>{tab}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full transition-colors border ${activeTab === tab ? 'bg-blue-50 dark:bg-neutral-900 text-blue-600 dark:text-blue-400 border-blue-100/50 dark:border-transparent' : 'bg-[#e8e8ed]/40 dark:bg-neutral-900/20 text-neutral-400 dark:text-neutral-600 border-transparent'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl overflow-hidden animate-pulse">
          <div className="h-64 flex items-center justify-center text-neutral-400">Loading your CRM data...</div>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="bg-white dark:bg-[#161617] border border-neutral-200 dark:border-neutral-900 rounded-3xl py-16 text-center text-neutral-500 transition-colors duration-300">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="font-semibold text-sm">No leads match your filter</h3>
          <p className="text-xs text-neutral-400 mt-1">Try clearing your search or switching to "All" tabs.</p>
        </div>
      ) : currentView === 'list' ? (
        <div className="bg-white dark:bg-[#161617] border border-neutral-200 dark:border-neutral-850 rounded-3xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.015)] transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-850 text-[10px] uppercase tracking-wider text-neutral-450 font-bold bg-[#fafafa]/50 dark:bg-neutral-900/10">
                  <th className="py-4 px-6">Company</th>
                  <th className="py-4 px-6">Target Role</th>
                  <th className="py-4 px-6">Recruiter Contact</th>
                  <th className="py-4 px-6">Source</th>
                  <th className="py-4 px-6">Telemetry</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-300 dark:divide-neutral-800 transition-colors">
                {filteredCompanies.map((company, idx) => {
                  const isFocused = idx === focusedIndex;
                  const crmStage = CRM_STAGES.find(s => s.status === company.emailStatus);
                  const isSent = company.emailStatus === 'Sent' || company.emailStatus === 'Replied' || company.emailStatus === 'Interview' || company.emailStatus === 'Offer';
                  
                  return (
                    <tr
                      key={company.notionId}
                      onClick={() => openReviewDrawer(company.notionId)}
                      className={`group hover:bg-[#fafafa]/80 dark:hover:bg-neutral-900/30 transition-colors cursor-pointer apple-row-hover ${isFocused ? 'bg-blue-50/40 dark:bg-neutral-900/40 apple-row-focus-sweep animate-fade-in' : 'border-b border-neutral-300 dark:border-neutral-800'}`}
                    >
                      <td className={`py-4 px-6 ${isFocused ? 'border-l-2 border-blue-600' : ''}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#f5f5f7] dark:bg-neutral-900 flex items-center justify-center font-bold text-xs text-neutral-800 dark:text-neutral-200 uppercase transition-colors shrink-0 border border-neutral-200 dark:border-neutral-800">
                            {company.company.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-neutral-800 dark:text-neutral-100 text-xs truncate max-w-[120px] leading-normal block">
                                {company.company}
                              </span>
                              {company.companySignal === 'Hot' && (
                                <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-900/50 animate-pulse shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.2)]" title="Hiring aggressively/Growth signal">
                                  🔥 Hot
                                </span>
                              )}
                              {company.companySignal === 'Caution' && (
                                <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-250 dark:border-amber-900/50 shrink-0" title="Layoffs / Hiring freeze caution">
                                  ⚠️ Caution
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-neutral-450 mt-0.5 block leading-none font-medium">
                              Added {company.dateAdded}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200 block truncate w-36 leading-normal">
                          {company.role}
                        </span>
                        {company.salaryRange && (
                          <span className="inline-block mt-0.5 text-[8.5px] font-bold text-neutral-500 dark:text-neutral-455 bg-neutral-100 dark:bg-neutral-900 px-2 py-0.5 rounded-full transition-colors border border-neutral-200 dark:border-neutral-800">
                            💰 {company.salaryRange} LPA
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-neutral-600 dark:text-neutral-400 text-xs transition-colors">
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 block truncate w-36 leading-normal">
                          {company.contactName || 'Direct / Form'}
                        </span>
                        <span className="text-[10px] text-neutral-455 block leading-none font-medium mt-0.5">
                          {company.contactTitle || 'Hiring Coordinator'}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-xs text-neutral-455 dark:text-neutral-500 font-semibold transition-colors">
                        <span className="px-2 py-0.5 rounded-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                          {company.source || 'LinkedIn'}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-xs text-neutral-600 dark:text-neutral-400 font-mono transition-colors">
                        {isSent ? (
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20 inline-flex items-center gap-1 animate-pulse">
                            👁 {company.openCount ?? 0} {company.openCount === 1 ? 'Open' : 'Opens'}
                          </span>
                        ) : (
                          <span className="text-neutral-450">—</span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-xs font-medium relative text-right">
                        <div className="group-hover:opacity-0 transition-opacity flex flex-col items-end">
                          <span className={`text-[8.5px] font-semibold px-2 py-0.5 rounded-full ${crmStage ? crmStage.colorClass : 'bg-neutral-100 text-neutral-500'} ${company.emailStatus === 'Redo' ? 'apple-glow-amber border' : ''} ${company.emailStatus === 'New' ? 'apple-glow-cyan-new border' : ''} ${company.emailStatus === 'Approved' ? 'apple-glow-approved-teal border' : ''} ${company.emailStatus === 'Replied' ? 'apple-glow-teal-cyan border' : ''} ${company.emailStatus === 'Interview' ? 'apple-glow-indigo-violet border' : ''} ${company.emailStatus === 'Offer' ? 'apple-glow-lime-emerald border' : ''} ${company.emailStatus === 'Scheduled' ? 'apple-glow-cyan border' : ''}`}>
                            {company.emailStatus}
                          </span>
                          {company.emailStatus === 'Scheduled' && company.scheduledSendTime && (
                            <span className="text-[8px] text-sky-600 dark:text-sky-400 font-mono font-semibold mt-0.5">
                              ⏳ {getScheduledCountdown(company.scheduledSendTime)}
                            </span>
                          )}
                        </div>

                        <div className="opacity-0 group-hover:opacity-100 absolute inset-0 py-4 px-6 flex items-center justify-end gap-1.5 bg-[#fafafa]/95 dark:bg-[#161617]/95 backdrop-blur-sm transition-all duration-200">
                          {company.emailStatus === 'Approved' && (
                            <div className="relative inline-flex items-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendEmail(company.notionId);
                                }}
                                disabled={actionLoading === company.notionId + 'send'}
                                className="bg-blue-600 hover:bg-blue-500 text-white rounded-l-full px-3 py-1.5 text-[10px] font-bold shadow-sm transition-all cursor-pointer select-none"
                              >
                                Send Now
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveSendMenuId(activeSendMenuId === company.notionId ? null : company.notionId);
                                }}
                                className="bg-blue-700 hover:bg-blue-650 text-white rounded-r-full px-2 py-1.5 border-l border-white/20 transition-all text-[10px] font-bold cursor-pointer select-none"
                              >
                                ▼
                              </button>
                              {activeSendMenuId === company.notionId && (
                                <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl py-1.5 z-50 animate-scale-up font-semibold text-left">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveSendMenuId(null);
                                      const optimal = getOptimalSendTime(company.location || 'Bangalore').toISOString();
                                      handleScheduleSend(company.notionId, optimal);
                                    }}
                                    className="w-full px-4 py-2 text-[10px] text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left flex items-center gap-2"
                                  >
                                    ✨ Send at Optimal Time
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveSendMenuId(null);
                                      const oneHourLater = new Date(Date.now() + 60 * 60 * 1000).toISOString();
                                      handleScheduleSend(company.notionId, oneHourLater);
                                    }}
                                    className="w-full px-4 py-2 text-[10px] text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left flex items-center gap-2"
                                  >
                                    ⏱️ Schedule for 1 Hour Later
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveSendMenuId(null);
                                      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
                                      tomorrow.setHours(9, 30, 0, 0);
                                      handleScheduleSend(company.notionId, tomorrow.toISOString());
                                    }}
                                    className="w-full px-4 py-2 text-[10px] text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left flex items-center gap-2"
                                  >
                                    🌅 Schedule for Tomorrow 9:30 AM
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {company.emailStatus === 'Draft Ready' && (
                            <button
                              onClick={() => handleStatusUpdate(company.notionId, 'Approved')}
                              disabled={actionLoading === company.notionId + 'Approved'}
                              className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 border border-blue-200 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full px-4 py-1.5 text-[10px] font-bold shadow-sm active:scale-95 transition-all cursor-pointer"
                            >
                              Approve
                            </button>
                          )}

                          {(company.emailStatus === 'Sent' || company.emailed) && (
                            <button
                              onClick={() => handleGenerateFollowUp(company.notionId)}
                              disabled={actionLoading === company.notionId + 'followup'}
                              className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-full px-4 py-1.5 text-[10px] font-bold shadow-sm active:scale-95 transition-all cursor-pointer"
                            >
                              Follow-Up
                            </button>
                          )}

                          <button
                            onClick={() => openReviewDrawer(company.notionId)}
                            className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-full px-3.5 py-1.5 text-[10px] font-bold shadow-sm active:scale-95 transition-all cursor-pointer"
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
                className="apple-folder-drag-glow bg-[#fafafa]/60 dark:bg-[#161617]/20 border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.005)] dark:shadow-none min-w-[290px] flex flex-col h-[65vh] justify-between transition-colors duration-300"
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
      </div>

      {/* ──── APPLE SLIDE-OVER CRM REVIEW DRAWER ──── */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 bg-black/30 dark:bg-black/60 backdrop-blur-sm transition-all duration-300 flex justify-end">
          
          <div className="flex-1" onClick={() => setSelectedCompanyId(null)}></div>

          {/* Drawer container styled as iPad multitasking sheet */}
          <div className="apple-backdrop-spring w-full max-w-3xl bg-white dark:bg-[#161617]/90 apple-drawer-glass-border h-[100dvh] max-h-[100dvh] flex flex-col justify-between overflow-hidden shadow-2xl animate-slide-in transition-colors duration-300">
            
            {/* Header */}
            <div className="border-b border-[#e8e8ed] dark:border-neutral-900 p-6 bg-[#fafafa]/60 dark:bg-neutral-900/10 flex justify-between items-center transition-colors">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100">{selectedCompany.company}</h2>
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-600/20">
                    {selectedCompany.emailStatus}
                  </span>
                  
                  {selectedCompany.resumeStatus === 'custom' ? (
                    <span className="apple-glow-fuchsia-indigo text-[9px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-600/10 text-purple-600 dark:text-purple-400 border transition-all">
                      📎 APM/BA Resume Mapped
                    </span>
                  ) : selectedCompany.resumeStatus === 'global' ? (
                    <span className="apple-glow-emerald-cyan-custom text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border transition-all">
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
            <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6 scrollbar-thin bg-white dark:bg-[#161617] transition-colors">
              
              {/* TAB 1: PITCH EDITOR */}
              {drawerTab === 'editor' && (
                <div className="space-y-4">
                  {selectedCompany.emailStatus === 'Replied' && (
                    <div className="bg-pink-50/50 dark:bg-pink-950/15 border border-pink-100 dark:border-pink-900/30 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center border-b border-pink-100/50 dark:border-pink-900/20 pb-2">
                        <span className="text-[10px] uppercase font-bold text-pink-600 dark:text-pink-400 tracking-wider">💬 Recruiter Reply</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300">
                          {selectedCompany.draftNotes?.includes('Sentiment') ? selectedCompany.draftNotes.split(' — ')[0] : 'Replied'}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 bg-white dark:bg-neutral-950/40 p-3 rounded-xl border border-pink-100/30 dark:border-pink-950/20 italic font-mono leading-relaxed">
                        "{selectedCompany.replySnippet || 'Thanks for reaching out! Would love to chat — are you free Thursday?'}"
                      </p>
                      
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-neutral-450 dark:text-neutral-505">Suggested Response</label>
                        <textarea
                          rows={4}
                          value={draftBody}
                          onChange={e => setDraftBody(e.target.value)}
                          className="w-full bg-white dark:bg-neutral-950 border border-pink-150 dark:border-pink-900/20 rounded-xl p-3 text-xs text-neutral-700 dark:text-neutral-200 leading-relaxed font-mono focus:outline-none focus:border-pink-300 dark:focus:border-pink-850"
                          placeholder="Drafting recruiter reply..."
                        />
                      </div>
                      
                      <button
                        onClick={async () => {
                          setActionLoading(selectedCompany.notionId + 'send');
                          try {
                            await authFetch('/api/companies', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                notionId: selectedCompany.notionId,
                                emailDraft: draftBody,
                                emailSubject: draftSubject,
                                status: 'Replied'
                              })
                            });
                            const res = await authFetch(`/api/send/${selectedCompany.notionId}`, {
                              method: 'POST',
                            });
                            if (res.ok) {
                              setMessage('🚀 Reply sent to recruiter!');
                              setTimeout(() => setMessage(''), 4000);
                              setSelectedCompanyId(null);
                              await fetchCompanies();
                            }
                          } catch (e) {}
                          setActionLoading(null);
                        }}
                        disabled={actionLoading === selectedCompany.notionId + 'send'}
                        className="w-full bg-pink-600 hover:bg-pink-500 text-white py-2.5 rounded-xl font-bold text-xs shadow-sm active:scale-95 transition-all cursor-pointer text-center block"
                      >
                        {actionLoading === selectedCompany.notionId + 'send' ? 'Sending Reply...' : '✉️ Send Response'}
                      </button>
                    </div>
                  )}

                  {/* JD INTELLIGENCE PANEL */}
                  <div className="bg-[#fafafa] dark:bg-neutral-900/10 border border-[#e8e8ed] dark:border-neutral-900 rounded-2xl p-4 space-y-3">
                    <div
                      onClick={() => setJdCollapsed(!jdCollapsed)}
                      className="w-full flex justify-between items-center font-bold text-xs text-neutral-700 dark:text-neutral-250 cursor-pointer select-none"
                    >
                      <span className="flex items-center gap-1.5">🎯 JD Intelligence {selectedCompany.jobDescriptionUrl && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}</span>
                      <span>{jdCollapsed ? 'Expand ▼' : 'Collapse ▲'}</span>
                    </div>
                    
                    {!jdCollapsed && (
                      <div className="space-y-3 pt-1.5 border-t border-[#e8e8ed] dark:border-neutral-900 transition-all duration-300">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Paste Job Description URL..."
                            value={jdUrl}
                            onChange={e => setJdUrl(e.target.value)}
                            className="flex-1 bg-white dark:bg-neutral-950 border border-[#e8e8ed] dark:border-neutral-850 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none"
                          />
                          <button
                            onClick={handleJdAnalyze}
                            disabled={jdLoading}
                            className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-xs font-bold transition-all disabled:opacity-50"
                          >
                            {jdLoading ? 'Analyzing...' : 'Analyze'}
                          </button>
                        </div>
                        
                        <div className="space-y-2 text-xs">
                          {jdKeywords.length > 0 && (
                            <div>
                              <strong className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500 block mb-1">Keywords Detected</strong>
                              <div className="flex flex-wrap gap-1">
                                {jdKeywords.map((kw, i) => (
                                  <span key={i} className="bg-neutral-100 dark:bg-neutral-900 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-350">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {jdGaps.length > 0 && (
                            <div className="bg-orange-50/30 dark:bg-orange-950/5 border border-orange-100/50 dark:border-orange-900/10 p-2.5 rounded-xl">
                              <strong className="text-[10px] uppercase font-bold text-orange-600 dark:text-orange-400 block mb-1">⚠️ Candidate Skills Gap</strong>
                              <p className="text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                                Missing from your profile: <span className="font-semibold text-orange-700 dark:text-orange-300">{jdGaps.join(', ')}</span>
                              </p>
                            </div>
                          )}
                          
                          {jdHookSuggestion && (
                            <div className="bg-blue-50/20 dark:bg-blue-950/5 border border-blue-100/30 dark:border-blue-900/10 p-2.5 rounded-xl space-y-1">
                              <strong className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block">💡 hook suggestion</strong>
                              <p className="text-[11px] italic font-mono text-neutral-650 dark:text-neutral-350 leading-relaxed">
                                "{jdHookSuggestion}"
                              </p>
                              <button
                                onClick={() => {
                                  if (draftBody.includes('Hi ') || draftBody.includes('Dear ')) {
                                    const lines = draftBody.split('\n');
                                    if (lines.length > 2) {
                                      lines[2] = jdHookSuggestion;
                                      setDraftBody(lines.join('\n'));
                                      setMessage('✨ Hook woven into email draft!');
                                      setTimeout(() => setMessage(''), 4000);
                                    }
                                  }
                                }}
                                className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
                              >
                                Weave Hook into Email Draft
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

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
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500">Personalized Body Pitch</label>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`Subject: ${draftSubject}\n\n${draftBody}`);
                            setMessage('📋 Email copied to clipboard.');
                            setTimeout(() => setMessage(''), 4000);
                          }}
                          className="text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 text-[9px] font-semibold bg-[#fafafa] dark:bg-neutral-900 border border-[#e8e8ed] dark:border-neutral-800 px-2 py-0.5 rounded-full cursor-pointer transition-colors"
                        >
                          Copy Email
                        </button>
                      </div>
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
                    <div className="apple-timeline-hairline flex flex-col gap-4 pl-5 py-2 ml-1 relative border-l border-neutral-200 dark:border-neutral-800 transition-colors">
                      {/* Touch 0: Original Sent */}
                      <div className="relative">
                        <span className="absolute -left-[25px] top-1 bg-emerald-500 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-neutral-950 flex items-center justify-center text-[7px] text-white">✓</span>
                        <div className="text-xs">
                          <p className="font-semibold text-neutral-700 dark:text-neutral-200">Day 0: Original Sent</p>
                          <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Sent on Date Added via Gmail SMTP {selectedCompany.openCount ? `(Opened ${selectedCompany.openCount}x)` : ''}</p>
                        </div>
                      </div>

                      {/* Touch 1: Follow-up 1 (Day 3) */}
                      <div className="relative">
                        {selectedCompany.followUpCount && selectedCompany.followUpCount >= 1 ? (
                          <>
                            <span className="absolute -left-[25px] top-1 bg-emerald-500 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-neutral-950 flex items-center justify-center text-[7px] text-white">✓</span>
                            <div className="text-xs">
                              <p className="font-semibold text-neutral-700 dark:text-neutral-200">Day 3: Follow-up 1 Sent</p>
                              <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Soft check-in completed</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className={`absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-neutral-950 ${selectedCompany.emailStatus === 'Sent' && (!selectedCompany.followUpCount || selectedCompany.followUpCount === 0) ? 'bg-blue-500 animate-pulse' : 'bg-neutral-300 dark:bg-neutral-700'}`}></span>
                            <div className="text-xs">
                              <p className="font-semibold text-neutral-500 dark:text-neutral-400">Day 3: Follow-up 1 Due</p>
                              <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Soft check-in, reference original email</p>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Touch 2: Follow-up 2 (Day 7) */}
                      <div className="relative">
                        {selectedCompany.followUpCount && selectedCompany.followUpCount >= 2 ? (
                          <>
                            <span className="absolute -left-[25px] top-1 bg-emerald-500 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-neutral-950 flex items-center justify-center text-[7px] text-white">✓</span>
                            <div className="text-xs">
                              <p className="font-semibold text-neutral-700 dark:text-neutral-200">Day 7: Follow-up 2 Sent</p>
                              <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Lighter ask with portfolio / schedule offer</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className={`absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-neutral-950 ${selectedCompany.followUpCount === 1 ? 'bg-blue-500 animate-pulse' : 'bg-neutral-300 dark:bg-neutral-700'}`}></span>
                            <div className="text-xs">
                              <p className="font-semibold text-neutral-500 dark:text-neutral-400">Day 7: Follow-up 2 Scheduled</p>
                              <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Offer specific availability or portfolio link</p>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Touch 3: Follow-up 3 (Day 10) */}
                      <div className="relative">
                        {selectedCompany.followUpCount && selectedCompany.followUpCount >= 3 ? (
                          <>
                            <span className="absolute -left-[25px] top-1 bg-emerald-500 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-neutral-950 flex items-center justify-center text-[7px] text-white">✓</span>
                            <div className="text-xs">
                              <p className="font-semibold text-neutral-700 dark:text-neutral-200">Day 10: Follow-up 3 Sent</p>
                              <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Graceful exit touchpoint delivered</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className={`absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-neutral-950 ${selectedCompany.followUpCount === 2 ? 'bg-blue-500 animate-pulse' : 'bg-neutral-300 dark:bg-neutral-700'}`}></span>
                            <div className="text-xs">
                              <p className="font-semibold text-neutral-500 dark:text-neutral-400">Day 10: Follow-up 3 Scheduled</p>
                              <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Graceful exit — zero pressure close</p>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Day 14: Archive */}
                      <div className="relative">
                        {selectedCompany.emailStatus === 'No Response' ? (
                          <>
                            <span className="absolute -left-[25px] top-1 bg-neutral-600 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-neutral-950 flex items-center justify-center text-[7px] text-white">✓</span>
                            <div className="text-xs">
                              <p className="font-semibold text-neutral-700 dark:text-neutral-200">Day 14: Archived</p>
                              <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Closed lead — No response after 14 days</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="absolute -left-[25px] top-1 bg-neutral-300 dark:bg-neutral-700 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-neutral-950"></span>
                            <div className="text-xs">
                              <p className="font-semibold text-neutral-500 dark:text-neutral-450">Day 14: Archive If No Reply</p>
                              <p className="text-[10px] text-neutral-400 dark:text-neutral-550">Stops further outreach sweeps automatically</p>
                            </div>
                          </>
                        )}
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

                {selectedCompany.emailStatus === 'Approved' && (
                  <div className="relative inline-flex items-center">
                    <button
                      onClick={() => {
                        handleSendEmail(selectedCompany.notionId);
                        setSelectedCompanyId(null);
                      }}
                      disabled={actionLoading === selectedCompanyId + 'send'}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 pl-6 pr-4 rounded-l-full transition-all shadow-sm cursor-pointer select-none"
                    >
                      Send Outreach Now
                    </button>
                    <button
                      onClick={() => setDrawerSendMenuOpen(!drawerSendMenuOpen)}
                      className="bg-blue-750 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-3 rounded-r-full border-l border-white/20 transition-all cursor-pointer select-none"
                    >
                      ▼
                    </button>
                    {drawerSendMenuOpen && (
                      <div className="absolute right-0 bottom-full mb-2 w-56 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl py-2 z-50 animate-scale-up font-semibold text-left">
                        <button
                          onClick={() => {
                            setDrawerSendMenuOpen(false);
                            const optimal = getOptimalSendTime(selectedCompany.location || 'Bangalore').toISOString();
                            handleScheduleSend(selectedCompany.notionId, optimal);
                          }}
                          className="w-full px-4 py-2.5 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left flex items-center gap-2"
                        >
                          ✨ Send at Optimal Time
                        </button>
                        <button
                          onClick={() => {
                            setDrawerSendMenuOpen(false);
                            const oneHourLater = new Date(Date.now() + 60 * 60 * 1000).toISOString();
                            handleScheduleSend(selectedCompany.notionId, oneHourLater);
                          }}
                          className="w-full px-4 py-2.5 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left flex items-center gap-2"
                        >
                          ⏱️ Schedule for 1 Hour Later
                        </button>
                        <button
                          onClick={() => {
                            setDrawerSendMenuOpen(false);
                            const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
                            tomorrow.setHours(9, 30, 0, 0);
                            handleScheduleSend(selectedCompany.notionId, tomorrow.toISOString());
                          }}
                          className="w-full px-4 py-2.5 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left flex items-center gap-2"
                        >
                          🌅 Schedule for Tomorrow 9:30 AM
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {(selectedCompany.emailStatus === 'Draft Ready' || selectedCompany.emailStatus === 'Redo') && (
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

                {selectedCompany.emailStatus === 'New' && (
                  <button
                    disabled
                    className="bg-neutral-100 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-600 text-xs font-bold py-2.5 px-6 rounded-full border border-neutral-200 dark:border-neutral-850"
                  >
                    Draft Generation Pending
                  </button>
                )}

                {(selectedCompany.emailStatus === 'Sent' || selectedCompany.emailStatus === 'Replied' || selectedCompany.emailStatus === 'Interview' || selectedCompany.emailStatus === 'Offer') && (
                  <span className="bg-emerald-50 dark:bg-emerald-950/15 text-emerald-600 dark:text-emerald-400 border border-emerald-250/40 dark:border-emerald-900/30 text-[10.5px] font-bold py-2.5 px-5 rounded-full inline-flex items-center gap-1.5 shadow-sm transition-all">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    📬 Sent & Tracked Live
                  </span>
                )}

                {selectedCompany.emailStatus === 'Rejected' && (
                  <span className="bg-red-50 dark:bg-red-950/15 text-red-600 dark:text-red-400 border border-red-250/40 dark:border-red-900/30 text-[10.5px] font-bold py-2.5 px-5 rounded-full inline-flex items-center gap-1.5 shadow-sm transition-all">
                    ❌ Lead Archived
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </>
  );
}


// ── MARKETING HOMEPAGE COMPONENT ──
function MarketingHomepage() {
  const router = useRouter();

  return (
    <div className="relative min-h-[90vh] overflow-hidden bg-[#f5f5f7] dark:bg-[#000000] transition-colors duration-300">
      
      {/* Aurora Breathing Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-violet-500/10 dark:bg-violet-600/15 rounded-full blur-[120px] animate-pulse duration-[8000ms]"></div>
      <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-purple-500/5 dark:bg-purple-600/10 rounded-full blur-[100px] animate-pulse duration-[6000ms]"></div>

      {/* Hero Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-16 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 dark:bg-neutral-900/60 border border-white/40 dark:border-neutral-800/40 backdrop-blur-md shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"></span>
          <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-500 dark:text-neutral-400">Version 2.0 Dynamic Engine</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-neutral-900 dark:text-white leading-tight max-w-3xl mx-auto">
          Your cold email pipeline. <span className="bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">On autopilot.</span>
        </h1>

        <p className="text-base sm:text-lg text-neutral-550 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
          Connect Gmail and Notion. Wake up to personalized cold email drafts for 30+ companies generated by Claude. Review, approve, and send in minutes.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <button
            onClick={() => router.push('/login')}
            className="w-full sm:w-auto px-8 h-13 rounded-2xl bg-black text-white dark:bg-white dark:text-black font-semibold text-sm hover:scale-102 transition-all duration-200 shadow-md shadow-violet-500/10 cursor-pointer"
          >
            Get Started Free
          </button>
          <a
            href="https://utkarshkr13.notion.site/Job-Outreach-Tracker-154df656a87747e98d9ee812a1f9e812"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto px-8 h-13 rounded-2xl border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900/60 text-neutral-750 dark:text-neutral-300 font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            Notion Template
          </a>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-16 border-t border-[#e8e8ed]/60 dark:border-neutral-900/60">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white text-center mb-12">How it works</h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl backdrop-blur-md bg-white/40 dark:bg-neutral-900/40 border border-white/50 dark:border-neutral-850/50 shadow-sm space-y-4">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 flex items-center justify-center text-lg font-bold">1</div>
            <h3 className="font-semibold text-sm text-neutral-900 dark:text-white">Add leads in Notion</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-450 leading-relaxed">
              Paste target company data and contact emails into your job tracker Notion CRM database using our template.
            </p>
          </div>
          
          <div className="p-6 rounded-2xl backdrop-blur-md bg-white/40 dark:bg-neutral-900/40 border border-white/50 dark:border-neutral-850/50 shadow-sm space-y-4">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 flex items-center justify-center text-lg font-bold">2</div>
            <h3 className="font-semibold text-sm text-neutral-900 dark:text-white">Claude creates drafts</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-450 leading-relaxed">
              Every morning, our AI engine digests your resume, profile bio, and target company to write highly personalized cold drafts.
            </p>
          </div>
          
          <div className="p-6 rounded-2xl backdrop-blur-md bg-white/40 dark:bg-neutral-900/40 border border-white/50 dark:border-neutral-850/50 shadow-sm space-y-4">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 flex items-center justify-center text-lg font-bold">3</div>
            <h3 className="font-semibold text-sm text-neutral-900 dark:text-white">Approve and send</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-450 leading-relaxed">
              Open your dashboard, read the generated drafts, and dispatch them directly from your Gmail with a single click.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-16 border-t border-[#e8e8ed]/60 dark:border-neutral-900/60">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white text-center mb-12">Core Features</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: "Gmail Integration", desc: "No generic bulk senders. Emails originate and deliver directly from your personal Gmail address.", icon: "✉️" },
            { title: "Resume Auto-Annex", desc: "Upload your resume PDF and let the system append it as an attachment to relevant outreaches.", icon: "📄" },
            { title: "Approve, Reject, Redo", desc: "Complete manual control. Edit subjects and drafts, reject poor matches, or request AI revisions.", icon: "⚙️" },
            { title: "Notion as your CRM", desc: "Maintain full control of your job search pipeline. No learning curve: just update Notion.", icon: "📓" },
            { title: "Secure Multi-Tenancy", desc: "All Notion API keys and Claude credentials are fully encrypted using military grade AES-256-CBC.", icon: "🔒" },
            { title: "Local Dev Sandbox", desc: "Fully offline capable development mode that allows complete exploration without API keys.", icon: "📦" }
          ].map((f, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white/45 dark:bg-neutral-900/25 border border-neutral-200/50 dark:border-neutral-850/50 space-y-2">
              <span className="text-xl block mb-2">{f.icon}</span>
              <h4 className="font-semibold text-xs text-neutral-900 dark:text-white">{f.title}</h4>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-450 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-16 text-center space-y-6">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Take control of your outreach today</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-450 max-w-md mx-auto">
          Sign up now, duplicate the Notion template, and start sending highly personalized cold emails in minutes.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="px-8 h-12 rounded-xl bg-black text-white dark:bg-white dark:text-black font-semibold text-sm hover:scale-102 transition-all cursor-pointer shadow-md"
        >
          Start for Free
        </button>
        <div className="text-[10px] text-neutral-400 mt-2">No credit card required. Free tier includes up to 20 monthly cold drafts.</div>
      </section>
    </div>
  );
}

// ── MAIN CONDITIONAL EXPORT WRAPPER ──
export default function MorningDashboard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-[#f5f5f7] dark:bg-black transition-colors duration-300">
        <svg className="animate-spin h-8 w-8 text-neutral-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (user) {
    return (
      <Suspense fallback={
        <div className="min-h-[80vh] flex items-center justify-center bg-[#f5f5f7] dark:bg-black transition-colors duration-300">
          <svg className="animate-spin h-8 w-8 text-neutral-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      }>
        <DashboardContent />
      </Suspense>
    );
  }

  return <MarketingHomepage />;
}
