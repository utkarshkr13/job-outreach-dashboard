'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Company } from '@/types';

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

  useEffect(() => {
    authFetch('/api/companies').then(r => r.json()).then((data: Company[]) => {
      const c = data.find(x => x.notionId === params.id);
      if (c) {
        setCompany(c);
        setEditedSubject(c.emailSubject ?? '');
        setEditedBody(c.emailDraft ?? '');
      }
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
              <span>{company.salaryRange ? `${company.salaryRange} LPA` : 'Competitive'}</span>
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

      {/* ── CRM PIPELINE ACTIONS ── */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
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
