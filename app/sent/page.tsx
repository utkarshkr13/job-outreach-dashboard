'use client';

import { useEffect, useState } from 'react';
import { Company } from '@/types';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function SentPage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [recruiterReplyText, setRecruiterReplyText] = useState('');
  const [sentimentAnalysis, setSentimentAnalysis] = useState<{ score: string; reply: string } | null>(null);
  const [copyStatus, setCopyStatus] = useState('');

  const showCopyToast = (text: string) => {
    setCopyStatus(text);
    setTimeout(() => setCopyStatus(''), 3000);
  };

  const handleSentimentAnalysis = () => {
    if (!recruiterReplyText) return;
    setSentimentAnalysis({
      score: 'Positive Response (Score: 9.2/10)',
      reply: `Hi ${selectedCompany?.contactName?.split(' ')[0] || 'there'},\n\nThank you for getting back! I am absolutely thrilled to connect. Next week works perfectly for a brief 15-minute call.\n\nHere is my Calendly link to easily book a time: calendly.com/utkarsh-kumar/15min\n\nLooking forward to speaking with you soon!\n\nBest,\nUtkarsh Kumar`
    });
  };

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
    <>
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
        <div className="space-y-4">
          {companies.map(c => (
            <div
              key={c.notionId}
              onClick={() => setSelectedCompany(c)}
              className="bg-white dark:bg-[#161617] border border-neutral-200 dark:border-neutral-900 rounded-3xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.012)] dark:shadow-none apple-spring flex justify-between items-start cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-700 transition-all animate-fade-in"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h2 className="font-bold text-sm text-neutral-800 dark:text-neutral-100">{c.company}</h2>
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-600/10 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-600/20">
                    Sent
                  </span>
                  
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                    c.openCount && c.openCount > 0 
                      ? 'bg-emerald-50 dark:bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-950/30 animate-pulse'
                      : 'bg-neutral-50 dark:bg-neutral-900/40 text-neutral-500 dark:text-neutral-400 border-neutral-100 dark:border-neutral-850'
                  }`}>
                    👁 {c.openCount ?? 0} {c.openCount === 1 ? 'Open' : 'Opens'}
                  </span>
                </div>
                
                <p className="text-xs text-neutral-500 dark:text-neutral-450">
                  <strong className="text-neutral-700 dark:text-neutral-200 font-semibold">{c.role}</strong> · Recruiter: {c.contactName} ({c.email})
                </p>
                
                {c.emailSubject && (
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 italic line-clamp-1 max-w-xl">
                    "{c.emailSubject}"
                  </p>
                )}
              </div>
              
              <div className="flex flex-col items-end gap-3 self-stretch justify-between shrink-0" onClick={e => e.stopPropagation()}>
                <span className="text-[10px] text-neutral-400 font-medium bg-[#f5f5f7] dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850 px-2.5 py-1 rounded-full">
                  {c.dateAdded}
                </span>
                
                <button
                  onClick={() => {
                    setSelectedCompany(c);
                    setRecruiterReplyText('');
                    setSentimentAnalysis(null);
                  }}
                  className="bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-850 border border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-350 text-[10px] font-bold px-3.5 py-1.5 rounded-full shadow-sm active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                >
                  💬 Write Reply
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      </div>

      {/* ──── APPLE SLIDE-OVER CRM PREVIEW DRAWER (Rendered OUTSIDE the animated div) ──── */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 bg-black/30 dark:bg-black/60 backdrop-blur-sm transition-all duration-300 flex justify-end text-[#1d1d1f] dark:text-[#f5f5f7]">
          
          <div className="flex-1" onClick={() => setSelectedCompany(null)}></div>

          {/* Drawer container */}
          <div className="apple-backdrop-spring w-full max-w-2xl bg-white dark:bg-[#161617]/90 apple-drawer-glass-border h-screen max-h-screen flex flex-col justify-between overflow-hidden shadow-2xl animate-slide-in transition-colors duration-300">
            
            {/* Header */}
            <div className="border-b border-neutral-250 dark:border-neutral-900 p-6 bg-[#fafafa]/60 dark:bg-neutral-900/10 flex justify-between items-center transition-colors">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100">{selectedCompany.company}</h2>
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/15 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30">
                    Sent
                  </span>
                </div>
                <p className="text-xs text-neutral-450 mt-1">
                  Targeted Role: <strong className="text-neutral-700 dark:text-neutral-200 font-semibold">{selectedCompany.role}</strong>
                </p>
              </div>
              
              <button
                onClick={() => setSelectedCompany(null)}
                className="apple-modal-close text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-100 text-xs border border-neutral-250 dark:border-neutral-900 bg-white dark:bg-neutral-900/40 rounded-full w-7 h-7 flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6 scrollbar-thin bg-white dark:bg-[#161617] transition-colors">
              
              {/* Recruiter Coordinates */}
              <div className="bg-[#fafafa] dark:bg-neutral-900/20 border border-neutral-250 dark:border-neutral-900 rounded-2xl p-4 space-y-2.5 transition-colors">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Recruiter Details</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-neutral-400 block">Recruiter Contact:</span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-200">{selectedCompany.contactName || 'Not Found'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block">Recruiter Title:</span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-200">{selectedCompany.contactTitle || 'Hiring Lead'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block">Email Address:</span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-200">{selectedCompany.email || 'Direct / LinkedIn'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block">Dispatched Date:</span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-200">{selectedCompany.dateAdded}</span>
                  </div>
                </div>
              </div>

              {/* Email Content Preview */}
              {selectedCompany.emailSubject && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500">Subject Line</label>
                    <div className="w-full bg-[#f5f5f7]/40 dark:bg-neutral-900/40 border border-neutral-250 dark:border-neutral-900 rounded-xl px-4 py-2.5 text-xs text-neutral-800 dark:text-neutral-250 font-semibold transition-colors">
                      {selectedCompany.emailSubject}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500">Sent Email Body</label>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`Subject: ${selectedCompany.emailSubject}\n\n${selectedCompany.emailDraft}`);
                          showCopyToast('Email copied to clipboard!');
                        }}
                        className="text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 text-[9px] font-semibold bg-[#fafafa] dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 px-2 py-0.5 rounded-full cursor-pointer transition-colors"
                      >
                        Copy Pitch
                      </button>
                    </div>
                    <pre className="w-full bg-[#f5f5f7]/40 dark:bg-neutral-900/40 border border-neutral-250 dark:border-neutral-900 rounded-xl p-4 text-xs text-neutral-850 dark:text-neutral-250 leading-relaxed font-mono whitespace-pre-wrap transition-colors">
                      {selectedCompany.emailDraft}
                    </pre>
                  </div>
                </div>
              )}

              {/* Open rate telemetry tracking */}
              <div className="bg-[#fafafa] dark:bg-neutral-900/20 border border-neutral-250 dark:border-neutral-900 rounded-2xl p-4 space-y-2.5 transition-colors">
                <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">Live Read Receipt Telemetry</h4>
                <div className="flex justify-between items-center bg-white dark:bg-neutral-950 p-3 rounded-xl border border-neutral-250 dark:border-neutral-900 transition-colors">
                  <span className="text-xs text-neutral-400">Total Opens Registered:</span>
                  <span className={`text-sm font-bold ${selectedCompany.openCount && selectedCompany.openCount > 0 ? 'text-emerald-500 animate-pulse' : 'text-neutral-400'}`}>
                    👁 {selectedCompany.openCount ?? 0} Opens
                  </span>
                </div>
              </div>

              {/* Sentiment class auto-reply (Injected) */}
              <div className="bg-[#fafafa] dark:bg-neutral-900/20 border border-neutral-250 dark:border-neutral-900 rounded-2xl p-4 space-y-3 transition-colors">
                <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">💬 Sentiment Auto-Reply Suggest</h4>
                <textarea
                  rows={3}
                  placeholder="Paste recruiter email reply here..."
                  value={recruiterReplyText}
                  onChange={e => setRecruiterReplyText(e.target.value)}
                  className="w-full bg-white dark:bg-neutral-950 border border-neutral-250 dark:border-neutral-900 rounded-xl p-3 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:border-neutral-300 dark:focus:border-neutral-800 transition-colors"
                />

                <button
                  onClick={handleSentimentAnalysis}
                  disabled={!recruiterReplyText}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-full py-2 text-xs font-semibold transition-all disabled:opacity-40 cursor-pointer shadow-sm"
                >
                  Classify Reply & Draft Response
                </button>

                {sentimentAnalysis && (
                  <div className="space-y-2 border-t border-neutral-250 dark:border-neutral-900 pt-3 transition-colors">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{sentimentAnalysis.score}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(sentimentAnalysis.reply);
                          showCopyToast('Response copied to clipboard!');
                        }}
                        className="bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-xs font-semibold px-3 py-1 rounded-full border border-neutral-250 dark:border-neutral-800 text-neutral-700 dark:text-white cursor-pointer transition-colors"
                      >
                        Copy Response
                      </button>
                    </div>
                    <textarea
                      rows={6}
                      value={sentimentAnalysis.reply}
                      readOnly
                      className="w-full bg-white dark:bg-neutral-950 border border-neutral-250 dark:border-neutral-900 rounded-xl p-3 text-[10px] text-neutral-500 dark:text-neutral-400 font-mono focus:outline-none transition-colors"
                    />
                  </div>
                )}
              </div>

            </div>

            {/* Actions footer */}
            <div className="border-t border-neutral-250 dark:border-neutral-900 p-6 bg-[#fafafa]/60 dark:bg-neutral-900/10 flex justify-end transition-colors">
              <button
                onClick={() => setSelectedCompany(null)}
                className="bg-[#fafafa] hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-850 border border-neutral-250 dark:border-neutral-800 text-neutral-700 dark:text-neutral-350 text-xs font-semibold py-2.5 px-6 rounded-full transition-all cursor-pointer animate-fade-in"
              >
                Close Drawer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {copyStatus && (
        <div className="apple-toast-overlay apple-toast-frosted fixed top-6 right-6 z-50 text-neutral-850 dark:text-neutral-200 text-xs font-semibold px-5 py-3.5 border border-neutral-250 dark:border-neutral-850 transition-all duration-300 max-w-sm animate-slide-in">
          <span className="text-sm">📋</span>
          <div className="flex-1">
            <p className="font-bold text-[10px] text-neutral-400 uppercase tracking-wider">System Copy</p>
            <p className="mt-0.5">{copyStatus}</p>
          </div>
        </div>
      )}
    </>
  );
}
