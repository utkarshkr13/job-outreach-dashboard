'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Company } from '@/types';
import { getOptimalSendTime } from '@/lib/timing';
import { cleanSalary } from '@/lib/format';

export default function CompanyPage() {
  const { user } = useAuth();

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
  const params = useParams();
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [redoing, setRedoing] = useState(false);
  
  // Custom resume states
  const [resumeStatus, setResumeStatus] = useState<'custom' | 'global' | 'none'>('none');
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeMsg, setResumeMsg] = useState('');

  // JD states
  const [jdUrl, setJdUrl] = useState('');
  const [jdText, setJdText] = useState('');
  const [jdKeywords, setJdKeywords] = useState<string[]>([]);
  const [jdGaps, setJdGaps] = useState<string[]>([]);
  const [jdHookSuggestion, setJdHookSuggestion] = useState('');
  const [jdLoading, setJdLoading] = useState(false);
  const [jdCollapsed, setJdCollapsed] = useState(true);
  
  // Scheduling states
  const [drawerSendMenuOpen, setDrawerSendMenuOpen] = useState(false);

  useEffect(() => {
    authFetch('/api/companies')
      .then(r => r.json())
      .then((data: any) => {
        if (Array.isArray(data)) {
          const c = data.find(x => x.notionId === params.id);
          if (c) {
            setCompany(c);
            setEditedSubject(c.emailSubject ?? '');
            setEditedBody(c.emailDraft ?? '');
            setJdUrl(c.jobDescriptionUrl || '');
            setJdKeywords(c.jdKeywords ? c.jdKeywords.split(', ') : []);
            setJdGaps(c.skillsGap ? c.skillsGap.split(', ') : []);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });

    // Fetch custom resume status for this company
    authFetch(`/api/resume?companyId=${params.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.status) {
          setResumeStatus(data.status);
        }
      });
  }, [params.id]);

  const handleCustomResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.type !== 'application/pdf') {
      setResumeMsg('Only PDF files are allowed.');
      return;
    }

    setUploadingResume(true);
    setResumeMsg('');
    try {
      const res = await authFetch(`/api/resume/upload?companyId=${params.id}&filename=custom-${params.id}.pdf`, {
        method: 'POST',
        body: file,
      });
      if (!res.ok) throw new Error('Upload failed');
      setResumeStatus('custom');
      setResumeMsg('Custom resume attached successfully!');
    } catch (err: any) {
      setResumeMsg('Error: ' + err.message);
    } finally {
      setUploadingResume(false);
      setTimeout(() => setResumeMsg(''), 4000);
    }
  };

  const handleDeleteCustomResume = async () => {
    if (!confirm('Are you sure you want to delete the custom resume override for this company? It will revert back to your global default resume.')) return;
    
    setUploadingResume(true);
    try {
      const res = await authFetch(`/api/resume?companyId=${params.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      
      const checkRes = await authFetch(`/api/resume?companyId=${params.id}`);
      const checkData = await checkRes.json();
      setResumeStatus(checkData.status);
      setResumeMsg('Custom resume removed. Reverted to default.');
    } catch (err: any) {
      setResumeMsg('Error: ' + err.message);
    } finally {
      setUploadingResume(false);
      setTimeout(() => setResumeMsg(''), 4000);
    }
  };

  const handleApproveAndSend = async () => {
    setSending(true);
    await authFetch(`/api/approve/${params.id}`, { method: 'POST' });
    await authFetch(`/api/send/${params.id}`, { method: 'POST' });
    setSending(false);
    router.push('/');
  };

  const handleRedo = async () => {
    setRedoing(true);
    const res = await authFetch(`/api/redo/${params.id}`, { method: 'POST' });
    const data = await res.json();
    if (data.result) {
      setEditedSubject(data.result.subject);
      setEditedBody(data.result.body);
    }
    setRedoing(false);
  };

  const handleReject = async () => {
    await authFetch(`/api/reject/${params.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'Manually rejected from preview' }) });
    router.push('/');
  };

  const handleJdAnalyze = async () => {
    if (!company) return;
    setJdLoading(true);
    try {
      const res = await authFetch('/api/jd/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notionId: company.notionId, jdUrl, jdText }),
      });
      const data = await res.json();
      if (data.success) {
        setJdKeywords(data.keywords);
        setJdGaps(data.gapSkills);
        setJdHookSuggestion(data.hookSuggestion);
        
        // Refresh company
        const refreshedRes = await authFetch('/api/companies');
        const refreshedData = await refreshedRes.json();
        if (Array.isArray(refreshedData)) {
          const c = refreshedData.find((x: Company) => x.notionId === params.id);
          if (c) {
            setCompany(c);
            setEditedSubject(c.emailSubject ?? '');
            setEditedBody(c.emailDraft ?? '');
          }
        }
        
        setResumeMsg('✅ JD Analysis completed. Pitch hook updated.');
        setTimeout(() => setResumeMsg(''), 4000);
      }
    } catch (err) {
      console.error('JD analysis failed:', err);
    } finally {
      setJdLoading(false);
    }
  };

  const handleScheduleSend = async (id: string, customTime?: string) => {
    try {
      const res = await authFetch(`/api/send/${id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledFor: customTime }),
      });
      const data = await res.json();
      if (data.success) {
        setResumeMsg('⏰ Pitch scheduled successfully.');
        setTimeout(() => setResumeMsg(''), 4000);
        router.push('/');
      }
    } catch (err) {
      console.error('Scheduling failed:', err);
    }
  };

  if (loading) return <div className="text-center py-20 text-neutral-500">Loading lead data...</div>;
  if (!company) return <div className="text-center py-20 text-neutral-500 font-semibold">Lead record not found</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      
      {/* ── BACK NAVIGATION ── */}
      <button 
        onClick={() => router.back()} 
        className="group flex items-center gap-1.5 text-[#0071e3] hover:underline text-xs font-semibold select-none cursor-pointer"
      >
        <span className="text-[10px] transform group-hover:-translate-x-0.5 transition-transform">←</span> 
        <span>Back to Pipeline</span>
      </button>

      {/* ── COMPANY BRIEFING CARD ── */}
      <div className="bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-6 md:p-8 shadow-sm shadow-[rgba(0,0,0,0.01)]">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">{company.company}</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex flex-wrap items-center gap-1.5 font-medium">
              <span className="bg-[#f5f5f7] dark:bg-neutral-900 px-2 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-800">{company.role}</span>
              <span>•</span>
              <span>{company.location || 'Remote'}</span>
              <span>•</span>
              <span>{company.salaryRange ? `${cleanSalary(company.salaryRange)} LPA` : 'Competitive'}</span>
            </p>
          </div>
          {company.companyType && (
            <span className="text-[9px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800">
              {company.companyType}
            </span>
          )}
        </div>
        
        {company.draftNotes && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-950/30 rounded-2xl text-[11px] leading-relaxed">
            <span className="font-semibold block mb-0.5">⚠️ Ingestion Intelligence:</span>
            {company.draftNotes}
          </div>
        )}
      </div>

      {/* ── CUSTOM RESUME OVERRIDES WIDGET ── */}
      <div className="bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-6 shadow-sm shadow-[rgba(0,0,0,0.01)] space-y-4">
        <div>
          <h2 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Recruiter CV Override</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Define a customized document attached strictly to emails sent to {company.company}.</p>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-1">
          <div>
            {resumeStatus === 'custom' ? (
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Company-Specific Resume Attached
              </span>
            ) : resumeStatus === 'global' ? (
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Global Default Resume Active
              </span>
            ) : (
              <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                No Document Attached
              </span>
            )}
            <p className="text-[10px] leading-relaxed text-neutral-400 dark:text-neutral-500 mt-1">
              {resumeStatus === 'custom' 
                ? `Outreach CRM will attach the company-specific custom PDF override for ${company.company}.`
                : `Outreach CRM will automatically fall back to your global resume uploaded in Settings.`}
            </p>
            {resumeMsg && (
              <p className={`text-[10px] font-semibold mt-2 animate-fade-in ${resumeMsg.includes('Error') ? 'text-red-500' : 'text-emerald-500'}`}>
                {resumeMsg}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto self-center">
            <input 
              type="file" 
              accept="application/pdf"
              onChange={handleCustomResumeUpload}
              className="hidden" 
              id="custom-resume-file"
              disabled={uploadingResume}
            />
            <label 
              htmlFor="custom-resume-file"
              className="flex-1 md:flex-none text-center bg-[#f5f5f7] hover:bg-[#e8e8ed] dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 px-4 py-2.5 rounded-2xl text-[11px] font-bold border border-neutral-200 dark:border-neutral-850 cursor-pointer select-none block transition-all"
            >
              {uploadingResume ? 'Uploading...' : '📎 Upload Custom PDF'}
            </label>
            {resumeStatus === 'custom' && (
              <button 
                onClick={handleDeleteCustomResume}
                disabled={uploadingResume}
                className="bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-150 dark:border-red-950/40 px-3.5 py-2.5 rounded-2xl text-[11px] font-bold cursor-pointer transition-all"
              >
                Delete Custom
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── RECRUITER REPLY WIDGET ── */}
      {company.emailStatus === 'Replied' && (
        <div className="bg-white dark:bg-[#161617] border border-pink-100 dark:border-pink-900/30 rounded-3xl p-6 shadow-sm shadow-[rgba(0,0,0,0.01)] space-y-3">
          <div className="flex justify-between items-center border-b border-pink-100/50 dark:border-pink-900/20 pb-2">
            <span className="text-[10px] uppercase font-bold text-pink-600 dark:text-pink-400 tracking-wider">💬 Recruiter Reply</span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300">
              {company.draftNotes?.includes('Sentiment') ? company.draftNotes.split(' — ')[0] : 'Replied'}
            </span>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-300 bg-[#fafafa] dark:bg-neutral-950 p-3 rounded-xl border border-pink-100/30 dark:border-pink-950/20 italic font-mono leading-relaxed">
            "{company.replySnippet || 'Thanks for reaching out! Would love to chat — are you free Thursday?'}"
          </p>
        </div>
      )}

      {/* ── JD INTELLIGENCE PANEL ── */}
      <div className="bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-6 shadow-sm shadow-[rgba(0,0,0,0.01)] space-y-3">
        <div
          onClick={() => setJdCollapsed(!jdCollapsed)}
          className="w-full flex justify-between items-center font-bold text-xs text-neutral-700 dark:text-neutral-250 cursor-pointer select-none"
        >
          <span className="flex items-center gap-1.5">🎯 JD Intelligence {company.jobDescriptionUrl && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}</span>
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
                className="flex-1 bg-[#f5f5f7] dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl px-3 py-2 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:border-[#0071e3]"
              />
              <button
                onClick={handleJdAnalyze}
                disabled={jdLoading}
                className="bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-2xl px-4 py-2 text-xs font-bold transition-all disabled:opacity-50"
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
                      <span key={i} className="bg-neutral-150 dark:bg-neutral-900 px-2.5 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-350">
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
                      if (editedBody.includes('Hi ') || editedBody.includes('Dear ')) {
                        const lines = editedBody.split('\n');
                        if (lines.length > 2) {
                          lines[2] = jdHookSuggestion;
                          setEditedBody(lines.join('\n'));
                          setResumeMsg('✨ Hook woven into email draft!');
                          setTimeout(() => setResumeMsg(''), 4000);
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

      {/* ── EMAIL SUBJECT COMPOSER ── */}
      <div className="bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-6 shadow-sm shadow-[rgba(0,0,0,0.01)] space-y-3">
        <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Email Subject Line</label>
        <input
          value={editedSubject}
          onChange={e => setEditedSubject(e.target.value)}
          className="w-full bg-[#f5f5f7] dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl px-4 py-3 text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#0071e3] transition-all font-medium"
          placeholder="Enter pitch subject line..."
        />
      </div>

      {/* ── EMAIL BODY EDITOR ── */}
      <div className="bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-6 shadow-sm shadow-[rgba(0,0,0,0.01)] space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Email Body (Markdown/Plaintext)</label>
          <span className="text-[9px] text-neutral-400">{editedBody.length} characters</span>
        </div>
        <textarea
          value={editedBody}
          onChange={e => setEditedBody(e.target.value)}
          rows={12}
          className="w-full bg-[#f5f5f7] dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850 rounded-3xl px-4 py-4 text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#0071e3] transition-all font-mono leading-relaxed resize-none"
        />
      </div>

      {/* ── CADENCE TIMELINE WIDGET ── */}
      <div className="bg-white dark:bg-[#161617] border border-[#e8e8ed] dark:border-neutral-900 rounded-3xl p-6 shadow-sm shadow-[rgba(0,0,0,0.01)] space-y-3">
        <h3 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">📅 Threaded Cadence Touchpoints</h3>
        <div className="apple-timeline-hairline flex flex-col gap-4 pl-5 py-2 ml-1 relative border-l border-neutral-200 dark:border-neutral-800 transition-colors">
          <div className="relative">
            <span className="absolute -left-[25px] top-1 bg-emerald-500 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-neutral-950 flex items-center justify-center text-[7px] text-white">✓</span>
            <div className="text-xs">
              <p className="font-semibold text-neutral-700 dark:text-neutral-200">Day 0: Original Sent</p>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Sent from your mail client {company.lastContacted ? `on ${company.lastContacted}` : ''}</p>
            </div>
          </div>

          <div className="relative">
            {company.followUpCount && company.followUpCount >= 1 ? (
              <>
                <span className="absolute -left-[25px] top-1 bg-emerald-500 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-neutral-950 flex items-center justify-center text-[7px] text-white">✓</span>
                <div className="text-xs">
                  <p className="font-semibold text-neutral-700 dark:text-neutral-200">Day 3: Follow-up 1 Sent</p>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Soft check-in completed</p>
                </div>
              </>
            ) : (
              <>
                <span className={`absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-neutral-950 ${company.emailStatus === 'Sent' && (!company.followUpCount || company.followUpCount === 0) ? 'bg-blue-500 animate-pulse' : 'bg-neutral-300 dark:bg-neutral-700'}`}></span>
                <div className="text-xs">
                  <p className="font-semibold text-neutral-500 dark:text-neutral-400">Day 3: Follow-up 1 Due</p>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">Soft check-in, reference original email</p>
                </div>
              </>
            )}
          </div>

          <div className="relative">
            {company.followUpCount && company.followUpCount >= 2 ? (
              <>
                <span className="absolute -left-[25px] top-1 bg-emerald-500 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-neutral-950 flex items-center justify-center text-[7px] text-white">✓</span>
                <div className="text-xs">
                  <p className="font-semibold text-neutral-700 dark:text-neutral-200">Day 7: Follow-up 2 Sent</p>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Lighter ask with portfolio / schedule offer</p>
                </div>
              </>
            ) : (
              <>
                <span className={`absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-neutral-950 ${company.followUpCount === 1 ? 'bg-blue-500 animate-pulse' : 'bg-neutral-300 dark:bg-neutral-700'}`}></span>
                <div className="text-xs">
                  <p className="font-semibold text-neutral-500 dark:text-neutral-400">Day 7: Follow-up 2 Scheduled</p>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">Offer specific availability or portfolio link</p>
                </div>
              </>
            )}
          </div>

          <div className="relative">
            {company.followUpCount && company.followUpCount >= 3 ? (
              <>
                <span className="absolute -left-[25px] top-1 bg-emerald-500 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-neutral-950 flex items-center justify-center text-[7px] text-white">✓</span>
                <div className="text-xs">
                  <p className="font-semibold text-neutral-700 dark:text-neutral-200">Day 10: Follow-up 3 Sent</p>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Graceful exit touchpoint delivered</p>
                </div>
              </>
            ) : (
              <>
                <span className={`absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-neutral-950 ${company.followUpCount === 2 ? 'bg-blue-500 animate-pulse' : 'bg-neutral-300 dark:bg-neutral-700'}`}></span>
                <div className="text-xs">
                  <p className="font-semibold text-neutral-500 dark:text-neutral-455">Day 10: Follow-up 3 Scheduled</p>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Graceful exit — zero pressure close</p>
                </div>
              </>
            )}
          </div>

          <div className="relative">
            {company.emailStatus === 'No Response' ? (
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

      {/* ── CRM PIPELINE ACTIONS ── */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {company.emailStatus === 'Approved' ? (
          <div className="flex-1 relative flex items-center">
            <button
              onClick={handleApproveAndSend}
              disabled={sending}
              className="flex-1 bg-[#0071e3] hover:bg-[#0077ed] text-white py-3 rounded-l-2xl font-bold text-xs shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 select-none"
            >
              {sending ? 'Sending...' : '🚀 Approve & Deliver Pitch'}
            </button>
            <button
              onClick={() => setDrawerSendMenuOpen(!drawerSendMenuOpen)}
              className="bg-[#0061c3] hover:bg-[#0057b3] text-white py-3 px-3.5 rounded-r-2xl border-l border-white/20 transition-all font-bold text-xs cursor-pointer select-none"
            >
              ▼
            </button>
            {drawerSendMenuOpen && (
              <div className="absolute right-0 bottom-full mb-2 w-56 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl py-2 z-50 animate-scale-up font-semibold text-left">
                <button
                  onClick={() => {
                    setDrawerSendMenuOpen(false);
                    const optimal = getOptimalSendTime(company.location || 'Bangalore').toISOString();
                    handleScheduleSend(company.notionId, optimal);
                  }}
                  className="w-full px-4 py-2.5 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left flex items-center gap-2"
                >
                  ✨ Send at Optimal Time
                </button>
                <button
                  onClick={() => {
                    setDrawerSendMenuOpen(false);
                    const oneHourLater = new Date(Date.now() + 60 * 60 * 1000).toISOString();
                    handleScheduleSend(company.notionId, oneHourLater);
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
                    handleScheduleSend(company.notionId, tomorrow.toISOString());
                  }}
                  className="w-full px-4 py-2.5 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left flex items-center gap-2"
                >
                  🌅 Schedule for Tomorrow 9:30 AM
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={handleApproveAndSend}
            disabled={sending}
            className="flex-1 bg-[#0071e3] hover:bg-[#0077ed] text-white py-3 rounded-2xl font-bold text-xs shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 select-none"
          >
            {sending ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Sending Email...
              </span>
            ) : '🚀 Approve & Deliver Pitch'}
          </button>
        )}
        
        <button
          onClick={handleRedo}
          disabled={redoing}
          className="sm:w-36 bg-[#f5f5f7] hover:bg-[#e8e8ed] dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-850 py-3 rounded-2xl font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5 select-none transition-colors"
        >
          {redoing ? (
            <span className="flex items-center gap-1.5">
              <svg className="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Drafting...
            </span>
          ) : '🔄 Redo AI Draft'}
        </button>

        <button
          onClick={handleReject}
          className="sm:w-32 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-150 dark:border-red-950/40 py-3 rounded-2xl font-bold text-xs cursor-pointer select-none transition-colors"
        >
          ❌ Reject Lead
        </button>
      </div>
    </div>
  );
}
