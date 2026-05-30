'use client';

import { useState, useEffect } from 'react';

type ResumeType = 'global' | 'pm' | 'ba';

interface ResumeState {
  url: string | null;
  uploadedAt: string | null;
  loading: boolean;
  message: string;
  filename?: string;
  size?: string;
}

export default function SettingsPage() {
  // Resumes upload and status state
  const [resumes, setResumes] = useState<Record<ResumeType, ResumeState>>({
    global: { url: null, uploadedAt: null, loading: false, message: '', filename: 'global-resume.pdf', size: '142 KB' },
    pm: { url: null, uploadedAt: null, loading: false, message: '', filename: 'pm-resume.pdf', size: '158 KB' },
    ba: { url: null, uploadedAt: null, loading: false, message: '', filename: 'ba-resume.pdf', size: '135 KB' },
  });

  // AI smart routing keywords (persisted locally)
  const [pmKeywords, setPmKeywords] = useState<string[]>(['product', 'pm', 'agile', 'scrum', 'roadmap', 'owner', 'manager']);
  const [baKeywords, setBaKeywords] = useState<string[]>(['business', 'analyst', 'data', 'sql', 'python', 'analytics', 'tableau']);
  const [newPmKeyword, setNewPmKeyword] = useState('');
  const [newBaKeyword, setNewBaKeyword] = useState('');

  // Cold Outreach email signature and AI profile states (persisted locally)
  const [userName, setUserName] = useState('Utkarsh Kumar');
  const [userTitle, setUserTitle] = useState('Business Analyst & Associate PM Candidate');
  const [userCalendly, setUserCalendly] = useState('calendly.com/utkarsh-kumar/15min');
  const [userPhone, setUserPhone] = useState('+91 9969396063');
  const [linkedinUrl, setLinkedinUrl] = useState('linkedin.com/in/utkarsh-kumar-rajput-76b673232');
  
  // AI Tailor Bio & Career background profile
  const [aiBio, setAiBio] = useState('Dynamic operations and business systems analyst with 2+ years of hands-on experience owning end-to-end delivery at AI-first startups. Expert in Python data pipelines, relational SQL optimization, BRD design, and cross-functional agile orchestration.');
  const [aiTone, setAiTone] = useState<'confident' | 'balanced' | 'highly-technical' | 'conversational'>('balanced');
  const [selectedStrengths, setSelectedStrengths] = useState<string[]>(['BRD/PRD Writing', 'SQL/Python Analytics', 'Agile Delivery', 'UAT Testing']);
  
  // DevTools Database Reset controls
  const [reseedLoading, setReseedLoading] = useState(false);
  const [reseedMessage, setReseedMessage] = useState('');

  // Load state from localStorage on startup
  useEffect(() => {
    fetchResumeStatus('global');
    fetchResumeStatus('pm');
    fetchResumeStatus('ba');

    const savedPm = localStorage.getItem('crm-pm-keywords');
    if (savedPm) setPmKeywords(JSON.parse(savedPm));

    const savedBa = localStorage.getItem('crm-ba-keywords');
    if (savedBa) setBaKeywords(JSON.parse(savedBa));

    const savedName = localStorage.getItem('crm-user-name');
    if (savedName) setUserName(savedName);

    const savedTitle = localStorage.getItem('crm-user-title');
    if (savedTitle) setUserTitle(savedTitle);

    const savedCalendly = localStorage.getItem('crm-user-calendly');
    if (savedCalendly) setUserCalendly(savedCalendly);

    const savedPhone = localStorage.getItem('crm-user-phone');
    if (savedPhone) setUserPhone(savedPhone);

    const savedLinkedin = localStorage.getItem('crm-user-linkedin');
    if (savedLinkedin) setLinkedinUrl(savedLinkedin);

    const savedBio = localStorage.getItem('crm-ai-bio');
    if (savedBio) setAiBio(savedBio);

    const savedTone = localStorage.getItem('crm-ai-tone');
    if (savedTone) setAiTone(savedTone as any);

    const savedStrengths = localStorage.getItem('crm-ai-strengths');
    if (savedStrengths) setSelectedStrengths(JSON.parse(savedStrengths));
  }, []);

  const fetchResumeStatus = async (type: ResumeType) => {
    try {
      const companyIdParam = type !== 'global' ? `?companyId=${type}` : '';
      const res = await fetch(`/api/resume${companyIdParam}`);
      const data = await res.json();
      
      setResumes(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          url: data.url,
          uploadedAt: data.uploadedAt,
        }
      }));
    } catch (err) {
      console.error(`Failed to fetch ${type} resume status`, err);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: ResumeType) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    if (file.type !== 'application/pdf') {
      setResumes(prev => ({
        ...prev,
        [type]: { ...prev[type], message: 'Only PDF files are allowed.' }
      }));
      return;
    }

    setResumes(prev => ({
      ...prev,
      [type]: { ...prev[type], loading: true, message: '' }
    }));

    try {
      const companyIdParam = type !== 'global' ? `&companyId=${type}` : '';
      const filename = type === 'global' ? 'global-resume.pdf' : `${type}-resume.pdf`;
      
      const res = await fetch(`/api/resume/upload?filename=${filename}${companyIdParam}`, {
        method: 'POST',
        body: file,
      });

      if (!res.ok) throw new Error('Upload failed');
      
      const data = await res.json();
      
      setResumes(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          url: data.url,
          uploadedAt: new Date().toISOString(),
          loading: false,
          size: `${Math.round(file.size / 1024)} KB`,
          message: 'Resume parsed & uploaded successfully!'
        }
      }));
    } catch (err: any) {
      setResumes(prev => ({
        ...prev,
        [type]: { ...prev[type], loading: false, message: 'Error: ' + err.message }
      }));
    } finally {
      e.target.value = '';
      setTimeout(() => {
        setResumes(prev => ({
          ...prev,
          [type]: { ...prev[type], message: '' }
        }));
      }, 4000);
    }
  };

  const handleDeleteCustomResume = async (type: ResumeType) => {
    if (type === 'global') return; // Global deletion not allowed by CRM API
    setResumes(prev => ({
      ...prev,
      [type]: { ...prev[type], loading: true }
    }));

    try {
      const res = await fetch(`/api/resume?companyId=${type}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Deletion failed');
      
      setResumes(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          url: null,
          uploadedAt: null,
          loading: false,
          message: 'Custom resume deleted.'
        }
      }));
    } catch (err: any) {
      setResumes(prev => ({
        ...prev,
        [type]: { ...prev[type], loading: false, message: 'Delete error: ' + err.message }
      }));
    } finally {
      setTimeout(() => {
        setResumes(prev => ({
          ...prev,
          [type]: { ...prev[type], message: '' }
        }));
      }, 4000);
    }
  };

  // Persisting smart settings state changes
  const saveState = (key: string, value: any) => {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  };

  const addKeyword = (type: 'pm' | 'ba') => {
    if (type === 'pm') {
      if (!newPmKeyword || pmKeywords.includes(newPmKeyword.trim())) return;
      const updated = [...pmKeywords, newPmKeyword.trim().toLowerCase()];
      setPmKeywords(updated);
      saveState('crm-pm-keywords', updated);
      setNewPmKeyword('');
    } else {
      if (!newBaKeyword || baKeywords.includes(newBaKeyword.trim())) return;
      const updated = [...baKeywords, newBaKeyword.trim().toLowerCase()];
      setBaKeywords(updated);
      saveState('crm-ba-keywords', updated);
      setNewBaKeyword('');
    }
  };

  const removeKeyword = (type: 'pm' | 'ba', kw: string) => {
    if (type === 'pm') {
      const updated = pmKeywords.filter(k => k !== kw);
      setPmKeywords(updated);
      saveState('crm-pm-keywords', updated);
    } else {
      const updated = baKeywords.filter(k => k !== kw);
      setBaKeywords(updated);
      saveState('crm-ba-keywords', updated);
    }
  };

  const toggleStrength = (strength: string) => {
    const updated = selectedStrengths.includes(strength)
      ? selectedStrengths.filter(s => s !== strength)
      : [...selectedStrengths, strength];
    setSelectedStrengths(updated);
    saveState('crm-ai-strengths', updated);
  };

  // Re-seed Database trigger
  const triggerDbReset = async () => {
    setReseedLoading(true);
    setReseedMessage('');
    try {
      const res = await fetch('/api/companies/reset', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setReseedMessage('Database seeded back to 10 pristine recruiter pipelines!');
      } else {
        setReseedMessage('Failed to reset: ' + data.error);
      }
    } catch (e: any) {
      setReseedMessage('Error seeding database: ' + e.message);
    } finally {
      setReseedLoading(false);
      setTimeout(() => setReseedMessage(''), 5000);
    }
  };

  const strengthsList = [
    'BRD/PRD Writing', 'SQL/Python Analytics', 'Agile Delivery', 'UAT Testing',
    'User Flow Design', 'SaaS Billing Connect', 'CRM Automations', 'A/B Testing',
    'AI Integration', 'Metric Dashboard Design'
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-24 transition-colors duration-300">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e8e8ed] dark:border-neutral-900 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">Settings</h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Configure recruiter CV files, AI prompt intelligence routing, and outbound signature kits.</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-3 text-[10px] uppercase font-bold tracking-widest text-neutral-400">
          <span>Control Panel</span>
          <span>•</span>
          <span>v2.4 Enterprise</span>
        </div>
      </div>

      {/* ── SECTION 1: RESUME ROUTING SUITE ── */}
      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-[#1d1d1f] dark:text-neutral-200">1. Recruiter Document Routing</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Attach role-specific targeted documents. The CRM dynamically checks job titles and auto-appends corresponding PDFs.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Card Component Generator */}
          {([
            {
              type: 'global' as ResumeType,
              title: 'Global Default Resume',
              icon: '🌍',
              desc: 'Fallback document sent automatically to general roles when no job-specific targeted profile is matched.',
              accent: 'emerald',
            },
            {
              type: 'pm' as ResumeType,
              title: 'Product Manager Resume',
              icon: '🎯',
              desc: 'Product-focused profile automatically attached to all APM, Product Strategy, and Product Manager outreaches.',
              accent: 'blue',
            },
            {
              type: 'ba' as ResumeType,
              title: 'Business Analyst Resume',
              icon: '📊',
              desc: 'Data-focused analytical resume routed directly to all Business Analyst, SQL, Python, or data roles.',
              accent: 'purple',
            }
          ] as const).map(({ type, title, icon, desc, accent }) => {
            const r = resumes[type];
            const isActive = !!r.url;
            
            // Dynamic theme border colors
            const borderStyle = isActive
              ? accent === 'emerald'
                ? 'border-emerald-200 dark:border-emerald-950/60 shadow-sm shadow-emerald-500/5'
                : accent === 'blue'
                  ? 'border-blue-200 dark:border-blue-950/60 shadow-sm shadow-blue-500/5'
                  : 'border-purple-200 dark:border-purple-950/60 shadow-sm shadow-purple-500/5'
              : 'border-[#e8e8ed] dark:border-neutral-900';

            return (
              <div 
                key={type} 
                className={`bg-white dark:bg-[#161617] border ${borderStyle} rounded-3xl p-6 apple-spring flex flex-col justify-between h-[360px] relative`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{icon}</span>
                    {isActive ? (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        accent === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-950/30' :
                        accent === 'blue' ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-950/30' :
                        'bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-950/30'
                      }`}>
                        Active Profile
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-850">
                        Missing
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-neutral-100 mb-1">{title}</h3>
                  <p className="text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">{desc}</p>
                </div>

                <div className="space-y-4 mt-auto">
                  {/* File status container */}
                  {isActive ? (
                    <div className="bg-[#f5f5f7] dark:bg-neutral-900/50 border border-neutral-200/50 dark:border-neutral-850 rounded-2xl p-3 flex items-center justify-between">
                      <div className="flex flex-col min-w-0 pr-2">
                        <a 
                          href={r.url || '#'} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[11px] font-semibold text-[#0071e3] hover:underline flex items-center gap-1 truncate"
                        >
                          <span>📄</span> <span className="truncate">{r.filename || `${type}-resume.pdf`}</span>
                        </a>
                        <span className="text-[9px] text-neutral-400 dark:text-neutral-500 mt-0.5 flex items-center gap-1.5">
                          <span>{r.size || '120 KB'}</span>
                          <span>•</span>
                          <span>{r.uploadedAt ? new Date(r.uploadedAt).toLocaleDateString() : 'Active'}</span>
                        </span>
                      </div>
                      
                      {type !== 'global' && (
                        <button
                          onClick={() => handleDeleteCustomResume(type)}
                          disabled={r.loading}
                          className="p-1.5 rounded-full text-neutral-400 hover:text-red-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                          title="Remove custom resume"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="bg-neutral-50 dark:bg-neutral-900/20 border border-dashed border-neutral-200 dark:border-neutral-850 rounded-2xl p-4 text-center">
                      <p className="text-[10px] text-neutral-400 dark:text-neutral-500 italic">No PDF document attached</p>
                    </div>
                  )}

                  {/* Upload action container */}
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="application/pdf"
                      onChange={(e) => handleUpload(e, type)}
                      id={`upload-${type}`}
                      className="hidden"
                      disabled={r.loading}
                    />
                    <label 
                      htmlFor={`upload-${type}`}
                      className={`w-full py-2.5 rounded-2xl text-[11px] font-semibold cursor-pointer select-none text-center block transition-all duration-200 border ${
                        isActive
                          ? 'bg-[#f5f5f7] hover:bg-[#e8e8ed] dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-850'
                          : 'bg-[#0071e3] hover:bg-[#0077ed] text-white border-transparent shadow-sm'
                      }`}
                    >
                      {r.loading ? (
                        <span className="flex items-center justify-center gap-1.5">
                          <svg className="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Processing PDF...
                        </span>
                      ) : (
                        <span>📎 {isActive ? 'Replace Resume PDF' : 'Upload Resume PDF'}</span>
                      )}
                    </label>
                  </div>
                  
                  {r.message && (
                    <p className={`text-[10px] font-medium text-center animate-fade-in ${r.message.includes('Error') ? 'text-red-500' : 'text-emerald-500'}`}>
                      {r.message}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SECTION 2: AI SMART ROUTING RULEBOOK ── */}
      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-[#1d1d1f] dark:text-neutral-200">2. Smart Routing Core</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Customize keyword matching rules. Leads containing these phrases in the role description automatically route to the corresponding CV profile.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 glass-subpixel rounded-3xl p-6 md:p-8">
          {/* PM ROUTER */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                PM Keyword Matches
              </span>
              <span className="text-[10px] text-neutral-400">{pmKeywords.length} tags loaded</span>
            </div>

            <div className="flex flex-wrap gap-1.5 min-h-[90px] p-4 bg-[#f5f5f7] dark:bg-neutral-900/60 rounded-2xl border border-neutral-200/40 dark:border-neutral-850">
              {pmKeywords.map(kw => (
                <span 
                  key={kw} 
                  className="bg-white dark:bg-neutral-800 text-[#1d1d1f] dark:text-neutral-200 text-[10px] px-2.5 py-1 rounded-full border border-neutral-200/60 dark:border-neutral-700 flex items-center gap-1 shadow-sm font-medium"
                >
                  {kw}
                  <button 
                    onClick={() => removeKeyword('pm', kw)}
                    className="hover:text-red-500 font-bold ml-0.5 text-[9px] cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
              {pmKeywords.length === 0 && (
                <span className="text-[10px] text-neutral-400 italic">No rules active. Matching falls back to Global.</span>
              )}
            </div>

            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="e.g. associate pm"
                value={newPmKeyword}
                onChange={e => setNewPmKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addKeyword('pm')}
                className="flex-1 bg-[#f5f5f7] dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-[#1d1d1f] dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-600 apple-focus-ring"
              />
              <button 
                onClick={() => addKeyword('pm')}
                className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer text-[#1d1d1f] dark:text-neutral-200 transition-colors"
              >
                Add Rule
              </button>
            </div>
          </div>

          {/* BA ROUTER */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                BA Keyword Matches
              </span>
              <span className="text-[10px] text-neutral-400">{baKeywords.length} tags loaded</span>
            </div>

            <div className="flex flex-wrap gap-1.5 min-h-[90px] p-4 bg-[#f5f5f7] dark:bg-neutral-900/60 rounded-2xl border border-neutral-200/40 dark:border-neutral-850">
              {baKeywords.map(kw => (
                <span 
                  key={kw} 
                  className="bg-white dark:bg-neutral-800 text-[#1d1d1f] dark:text-neutral-200 text-[10px] px-2.5 py-1 rounded-full border border-neutral-200/60 dark:border-neutral-700 flex items-center gap-1 shadow-sm font-medium"
                >
                  {kw}
                  <button 
                    onClick={() => removeKeyword('ba', kw)}
                    className="hover:text-red-500 font-bold ml-0.5 text-[9px] cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
              {baKeywords.length === 0 && (
                <span className="text-[10px] text-neutral-400 italic">No rules active. Matching falls back to Global.</span>
              )}
            </div>

            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="e.g. data engineer"
                value={newBaKeyword}
                onChange={e => setNewBaKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addKeyword('ba')}
                className="flex-1 bg-[#f5f5f7] dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-[#1d1d1f] dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-600 apple-focus-ring"
              />
              <button 
                onClick={() => addKeyword('ba')}
                className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer text-[#1d1d1f] dark:text-neutral-200 transition-colors"
              >
                Add Rule
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: OUTBOUND PERSONALIZATION ENGINE ── */}
      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-[#1d1d1f] dark:text-neutral-200">3. Outbound Personalization Engine</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Customize your AI profile dossier and rich email signature appended to outbound drafts.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          
          {/* AI Tailoring dossier */}
          <div className="bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-6 md:p-8 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-neutral-100 flex items-center gap-1.5">
                <span>🤖</span> AI Ingestion Bio-Dossier
              </h3>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Professional background & bio</label>
                <textarea 
                  value={aiBio}
                  onChange={e => { setAiBio(e.target.value); saveState('crm-ai-bio', e.target.value); }}
                  rows={4}
                  className="w-full bg-[#f5f5f7] dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 text-xs text-[#1d1d1f] dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-600 apple-focus-ring resize-none leading-relaxed"
                  placeholder="Paste your quick elevator pitch and core accomplishments..."
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Primary Competencies & Core Strengths</label>
                <div className="flex flex-wrap gap-1.5">
                  {strengthsList.map(strength => {
                    const selected = selectedStrengths.includes(strength);
                    return (
                      <button
                        key={strength}
                        onClick={() => toggleStrength(strength)}
                        className={`text-[9px] px-2.5 py-1 rounded-full border transition-all cursor-pointer font-medium ${
                          selected 
                            ? 'bg-[#0071e3] border-transparent text-white shadow-sm' 
                            : 'bg-[#f5f5f7] dark:bg-neutral-900 border-neutral-200/50 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-850'
                        }`}
                      >
                        {strength}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Outreach Writing Style Tone</label>
                <div className="grid grid-cols-4 gap-1.5 bg-[#f5f5f7] dark:bg-neutral-900 p-1 rounded-xl">
                  {(['confident', 'balanced', 'highly-technical', 'conversational'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => { setAiTone(t); saveState('crm-ai-tone', t); }}
                      className={`text-[9px] py-1.5 rounded-lg capitalize transition-all cursor-pointer font-semibold ${
                        aiTone === t
                          ? 'bg-white dark:bg-neutral-800 text-[#0071e3] dark:text-neutral-100 shadow-sm'
                          : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-700'
                      }`}
                    >
                      {t.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 italic mt-4">
              * Changing these states updates the custom prompts fed into the LLM when creating outreach drafts.
            </p>
          </div>

          {/* Email Signature Composer with Live Preview */}
          <div className="bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-6 md:p-8 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-neutral-100 flex items-center gap-1.5">
                <span>✒️</span> Cold Email Signature Kit
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Full Name</label>
                  <input 
                    type="text"
                    value={userName}
                    onChange={e => { setUserName(e.target.value); saveState('crm-user-name', e.target.value); }}
                    className="w-full bg-[#f5f5f7] dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-[#1d1d1f] dark:text-neutral-200 apple-focus-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Professional Title</label>
                  <input 
                    type="text"
                    value={userTitle}
                    onChange={e => { setUserTitle(e.target.value); saveState('crm-user-title', e.target.value); }}
                    className="w-full bg-[#f5f5f7] dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-[#1d1d1f] dark:text-neutral-200 apple-focus-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Calendly link</label>
                  <input 
                    type="text"
                    value={userCalendly}
                    onChange={e => { setUserCalendly(e.target.value); saveState('crm-user-calendly', e.target.value); }}
                    className="w-full bg-[#f5f5f7] dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-[#1d1d1f] dark:text-neutral-200 apple-focus-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Mobile Contact</label>
                  <input 
                    type="text"
                    value={userPhone}
                    onChange={e => { setUserPhone(e.target.value); saveState('crm-user-phone', e.target.value); }}
                    className="w-full bg-[#f5f5f7] dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-[#1d1d1f] dark:text-neutral-200 apple-focus-ring"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">LinkedIn Profile URL</label>
                <input 
                  type="text"
                  value={linkedinUrl}
                  onChange={e => { setLinkedinUrl(e.target.value); saveState('crm-user-linkedin', e.target.value); }}
                  className="w-full bg-[#f5f5f7] dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-[#1d1d1f] dark:text-neutral-200 apple-focus-ring"
                />
              </div>

              {/* LIVE HTML RENDER PREVIEW */}
              <div className="space-y-2 pt-2">
                <span className="text-[9px] font-bold text-[#0071e3] uppercase tracking-wider block">Live Render Preview (HTML/Rich-Text)</span>
                <div className="bg-[#f5f5f7]/50 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-900 rounded-2xl p-4 text-[11px] leading-relaxed text-neutral-800 dark:text-neutral-300 font-sans shadow-inner">
                  <p className="font-semibold text-neutral-900 dark:text-white text-xs">{userName}</p>
                  <p className="text-neutral-500 dark:text-neutral-400 text-[10px] mt-0.5">{userTitle}</p>
                  <p className="text-[#0071e3] dark:text-blue-400 hover:underline cursor-pointer text-[10px] font-medium mt-1.5 flex items-center gap-1">
                    <span>📅</span> Booking Link: {userCalendly}
                  </p>
                  <div className="flex gap-3 text-neutral-400 dark:text-neutral-500 text-[9px] mt-2 border-t border-neutral-200/50 dark:border-neutral-900/60 pt-2">
                    <span className="flex items-center gap-0.5">📞 {userPhone}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">🔗 {linkedinUrl}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <span className="text-[9px] text-neutral-400 italic">
              * Active template automatically appends to outbound approved drafts in the review drawer.
            </span>
          </div>

        </div>
      </section>

      {/* ── SECTION 4: MOCK PLATFORM POWER UTILITIES ── */}
      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-[#1d1d1f] dark:text-neutral-200">4. CRM Power Utilities</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Developer operations to manage and maintain the job outreach environment.</p>
        </div>

        <div className="bg-[#fff3cd] dark:bg-neutral-900/20 border border-[#ffeeba] dark:border-neutral-850 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
              <span>⚠️</span> DevTools: Reset Mock CRM Lead Database
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-2xl leading-relaxed">
              Resets the database file to its initial state, creating 10 pristine recruiter pipelines (Stripe, Vercel, Retool, Slack, etc.) and clearing any manual changes. Highly useful to re-run demo flows.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end justify-center gap-2">
            <button
              onClick={triggerDbReset}
              disabled={reseedLoading}
              className={`px-5 py-2.5 rounded-2xl text-xs font-semibold select-none cursor-pointer transition-all duration-200 border ${
                reseedLoading 
                  ? 'bg-neutral-200 dark:bg-neutral-850 text-neutral-400 border-transparent' 
                  : 'bg-red-50 hover:bg-red-100 dark:bg-red-950/10 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-950/40 shadow-sm'
              }`}
            >
              {reseedLoading ? (
                <span className="flex items-center gap-1">
                  <svg className="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Resetting...
                </span>
              ) : 'Reset Database'}
            </button>
            {reseedMessage && (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold animate-fade-in mt-1">
                {reseedMessage}
              </p>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}
