'use client';

import { useEffect, useState } from 'react';
import { Company } from '@/types';
import { downloadPdf } from '@/lib/pdf';
import { cleanSalary } from '@/lib/format';

interface AuthUser { getIdToken: () => Promise<string> }

interface Props {
  company: Company;
  user: AuthUser | null;
  onClose: () => void;
  onUpdated: (notionId: string, patch: Partial<Company>) => void;
}

type Tab = 'editor' | 'intel' | 'cadence';

export default function CompanyDraftDrawer({ company, user, onClose, onUpdated }: Props) {
  const [tab, setTab] = useState<Tab>('editor');
  const [subject, setSubject] = useState(company.emailSubject || '');
  const [body, setBody] = useState(company.emailDraft || '');
  const [status, setStatus] = useState(company.emailStatus || 'New');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const [brief, setBrief] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);

  const [coverText, setCoverText] = useState('');
  const [coverLoading, setCoverLoading] = useState(false);

  const [replyText, setReplyText] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [sentimentLoading, setSentimentLoading] = useState(false);

  useEffect(() => {
    setSubject(company.emailSubject || '');
    setBody(company.emailDraft || '');
    setStatus(company.emailStatus || 'New');
    setTab('editor');
    setBrief(''); setCoverText(''); setReplyText(''); setSentiment('');
  }, [company.notionId]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 4000); };

  const authFetch = async (url: string, opts: RequestInit = {}) => {
    const token = user ? await user.getIdToken() : '';
    const headers: HeadersInit = { ...(opts.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    return fetch(url, { ...opts, headers });
  };

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

  const saveEdits = async () => {
    setSaving(true);
    try {
      await authFetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notionId: company.notionId, emailSubject: subject, emailDraft: body }),
      });
      onUpdated(company.notionId, { emailSubject: subject, emailDraft: body });
      flash('💾 Changes saved to Notion.');
    } catch (e: any) {
      flash(`❌ ${e?.message || 'Save failed.'}`);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    setSaving(true);
    try {
      await authFetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notionId: company.notionId, status: newStatus }),
      });
      setStatus(newStatus as any);
      onUpdated(company.notionId, { emailStatus: newStatus as any });
      flash(`✅ Moved to ${newStatus}.`);
    } catch (e: any) {
      flash(`❌ ${e?.message || 'Update failed.'}`);
    } finally {
      setSaving(false);
    }
  };

  const sendMail = async () => {
    if (!company.email) { flash('❌ No recipient email on this lead.'); return; }
    const s = encodeURIComponent(subject || `Application for ${company.role} at ${company.company}`);
    const b = encodeURIComponent((body || '').replace(/\n/g, '\r\n'));
    window.open(`mailto:${company.email}?subject=${s}&body=${b}`, '_self');
    await updateStatus('Sent');
    flash('📧 Mail client opened — attach your résumé PDF and send.');
  };

  const copyEmail = () => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    flash('📋 Email copied to clipboard.');
  };

  const genBrief = async () => {
    setBriefLoading(true); setBrief('');
    try {
      const res = await authFetch('/api/brief', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company }),
      });
      const data = await res.json();
      if (res.ok && data.brief) setBrief(data.brief);
      else flash(`❌ ${data.error || 'Could not generate brief.'}`);
    } catch (e: any) { flash(`❌ ${e?.message || 'Brief failed.'}`); }
    finally { setBriefLoading(false); }
  };

  const genCover = async () => {
    setCoverLoading(true);
    try {
      const res = await authFetch('/api/cover-letter', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company }),
      });
      const data = await res.json();
      if (res.ok && data.text) setCoverText(data.text);
      else flash(`❌ ${data.error || 'Could not generate cover letter.'}`);
    } catch (e: any) { flash(`❌ ${e?.message || 'Cover letter failed.'}`); }
    finally { setCoverLoading(false); }
  };

  const classifyReply = async () => {
    if (!replyText.trim()) return;
    setSentimentLoading(true); setSentiment('');
    try {
      const res = await authFetch('/api/replies/classify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyBody: replyText, notionId: company.notionId }),
      });
      const data = await res.json();
      setSentiment(data.suggestion || data.suggestedResponse || data.result || JSON.stringify(data));
    } catch (e: any) { flash(`❌ ${e?.message || 'Classify failed.'}`); }
    finally { setSentimentLoading(false); }
  };

  const tabBtn = (id: Tab, label: string) => (
    <button
      onClick={() => setTab(id)}
      className={`flex-1 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${tab === id ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 dark:bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-xl h-full bg-white dark:bg-[#0e0e0f] border-l border-neutral-200 dark:border-neutral-900 shadow-2xl overflow-y-auto animate-slide-in-right"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/90 dark:bg-[#0e0e0f]/90 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-900 px-6 py-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-neutral-900 dark:text-white">{company.company}</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">{status}</span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {company.role}{company.salaryRange ? ` · 💰 ${cleanSalary(company.salaryRange)} LPA` : ''}
            </p>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
              {company.contactName || 'Direct / Form'}{company.email ? ` · ${company.email}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 text-xl leading-none cursor-pointer px-2">×</button>
        </div>

        {toast && (
          <div className="mx-6 mt-4 text-xs px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-800">{toast}</div>
        )}

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-900 p-1 rounded-full">
            {tabBtn('editor', 'Pitch Editor')}
            {tabBtn('intel', 'AI Intel')}
            {tabBtn('cadence', 'Replies & Cadence')}
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {tab === 'editor' && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500">Email Subject Line</label>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Subject line"
                  className="w-full bg-[#f5f5f7]/60 dark:bg-neutral-900/40 border border-[#e8e8ed] dark:border-neutral-900 rounded-xl px-4 py-2.5 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:border-neutral-300 dark:focus:border-neutral-800"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500">Email Draft (from Notion)</label>
                  <button onClick={copyEmail} className="text-[9px] font-semibold bg-[#fafafa] dark:bg-neutral-900 border border-[#e8e8ed] dark:border-neutral-800 px-2 py-0.5 rounded-full cursor-pointer text-neutral-600 dark:text-neutral-300">Copy Email</button>
                </div>
                <textarea
                  rows={13}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="No draft in Notion yet — type your outreach here, or it will appear once your scheduled job writes it."
                  className="w-full bg-[#f5f5f7]/60 dark:bg-neutral-900/40 border border-[#e8e8ed] dark:border-neutral-900 rounded-xl p-4 text-xs text-neutral-800 dark:text-neutral-100 leading-relaxed font-mono focus:outline-none focus:border-neutral-300 dark:focus:border-neutral-800"
                />
                <div className="text-[10px] text-neutral-400 text-right">Word Count: <span className="font-semibold text-neutral-600 dark:text-neutral-300">{wordCount}</span></div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={saveEdits} disabled={saving} className="bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-850 border border-neutral-250 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-bold py-2.5 px-5 rounded-full shadow-sm cursor-pointer disabled:opacity-50">💾 Save Edits</button>
                {(status === 'Draft Ready' || status === 'Redo') && (
                  <button onClick={() => updateStatus('Approved')} disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-5 rounded-full shadow-sm cursor-pointer disabled:opacity-50">Approve</button>
                )}
                {company.email && (
                  <button onClick={sendMail} disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 px-6 rounded-full shadow-sm cursor-pointer disabled:opacity-50">Send via Mail Client</button>
                )}
              </div>
            </>
          )}

          {tab === 'intel' && (
            <>
              <div className="bg-[#fafafa] dark:bg-neutral-900/20 border border-[#e8e8ed] dark:border-neutral-900 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">🕵️ Company Intelligence Brief</h4>
                  <button onClick={genBrief} disabled={briefLoading} className="text-[10px] font-semibold bg-white dark:bg-neutral-900 border border-[#e8e8ed] dark:border-neutral-850 px-3.5 py-1 rounded-full cursor-pointer text-neutral-700 dark:text-neutral-300 disabled:opacity-50">{briefLoading ? 'Generating…' : brief ? 'Regenerate' : 'Generate'}</button>
                </div>
                {briefLoading ? (
                  <p className="text-xs text-neutral-400 animate-pulse">Researching {company.company} with AI…</p>
                ) : brief ? (
                  <div className="space-y-1.5 bg-white dark:bg-neutral-950 p-3.5 rounded-xl border border-[#e8e8ed] dark:border-neutral-900">
                    {brief.split('\n').filter(l => l.trim()).map((line, i) => {
                      const idx = line.indexOf(':');
                      const hasLabel = idx > 0 && idx < 40;
                      return (
                        <p key={i} className="text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-300">
                          {hasLabel ? (<><span className="font-semibold text-neutral-800 dark:text-neutral-100">{line.slice(0, idx + 1)}</span>{line.slice(idx + 1)}</>) : line}
                        </p>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-neutral-400 italic">Generate an AI brief on {company.company} to tailor your outreach.</p>
                )}
              </div>

              <div className="bg-[#fafafa] dark:bg-neutral-900/20 border border-[#e8e8ed] dark:border-neutral-900 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">📄 Cover Letter Generator</h4>
                  <button onClick={genCover} disabled={coverLoading} className="text-[10px] font-semibold bg-white dark:bg-neutral-900 border border-[#e8e8ed] dark:border-neutral-850 px-3.5 py-1 rounded-full cursor-pointer text-neutral-700 dark:text-neutral-300 disabled:opacity-50">{coverLoading ? 'Generating…' : coverText ? 'Regenerate' : 'Generate Letter'}</button>
                </div>
                {coverLoading ? (
                  <p className="text-xs text-neutral-400 animate-pulse">Drafting cover letter with AI…</p>
                ) : coverText ? (
                  <div className="space-y-2">
                    <textarea rows={12} value={coverText} onChange={e => setCoverText(e.target.value)} className="w-full bg-white dark:bg-neutral-950 border border-[#e8e8ed] dark:border-neutral-900 rounded-xl p-4 text-[11px] leading-relaxed text-neutral-700 dark:text-neutral-200 font-mono focus:outline-none" />
                    <button onClick={() => { downloadPdf(`cover_letter_${company.company.replace(/[^a-z0-9]+/gi, '_')}.pdf`, coverText); flash('📥 Cover letter PDF downloaded.'); }} className="w-full bg-white hover:bg-[#f5f5f7] dark:bg-neutral-900 dark:hover:bg-neutral-850 border border-[#e8e8ed] dark:border-neutral-850 text-neutral-700 dark:text-white rounded-xl py-2 text-xs font-semibold cursor-pointer">⬇ Download PDF</button>
                  </div>
                ) : (
                  <p className="text-[11px] text-neutral-400 italic">Generate a personalized cover letter for {company.company}, edit it, then download a real PDF.</p>
                )}
              </div>
            </>
          )}

          {tab === 'cadence' && (
            <>
              <div className="bg-[#fafafa] dark:bg-neutral-900/20 border border-[#e8e8ed] dark:border-neutral-900 rounded-2xl p-4 space-y-2">
                <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">🕒 Smart Timezone Advisor</h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Recruiter is in <strong className="text-neutral-800 dark:text-neutral-200">{company.location || 'India'}</strong>. Best send window: <strong className="text-emerald-600 dark:text-emerald-400">9:15 AM – 10:00 AM</strong> their time.
                </p>
              </div>
              <div className="bg-[#fafafa] dark:bg-neutral-900/20 border border-[#e8e8ed] dark:border-neutral-900 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">💬 Recruiter Reply — Sentiment & Suggested Response</h4>
                <textarea rows={3} value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Paste the recruiter's reply here…" className="w-full bg-white dark:bg-neutral-950 border border-[#e8e8ed] dark:border-neutral-900 rounded-xl p-3 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none" />
                <button onClick={classifyReply} disabled={sentimentLoading || !replyText.trim()} className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2 text-xs font-semibold cursor-pointer disabled:opacity-50">{sentimentLoading ? 'Analyzing…' : 'Classify Reply & Draft Response'}</button>
                {sentiment && (
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-300 whitespace-pre-line bg-white dark:bg-neutral-950 p-3 rounded-xl border border-[#e8e8ed] dark:border-neutral-900">{sentiment}</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
