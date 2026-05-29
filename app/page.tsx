'use client';
import { useEffect, useState } from 'react';
import { Company, EmailStatus } from '@/types';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  'New': 'bg-gray-700 text-gray-300',
  'Draft Ready': 'bg-blue-900 text-blue-300',
  'Approved': 'bg-green-900 text-green-300',
  'Sent': 'bg-purple-900 text-purple-300',
  'Rejected': 'bg-red-900 text-red-300',
  'Redo': 'bg-yellow-900 text-yellow-300',
};

export default function Dashboard() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filter, setFilter] = useState<string>('Draft Ready');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchCompanies = async () => {
    setLoading(true);
    const res = await fetch(`/api/companies?status=${filter}`);
    const data = await res.json();
    setCompanies(data);
    setLoading(false);
  };

  useEffect(() => { fetchCompanies(); }, [filter]);

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'redo' | 'send') => {
    setActionLoading(id + action);
    await fetch(`/api/${action}/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    setActionLoading(null);
    fetchCompanies();
  };

  const handleBulkSend = async () => {
    setBulkLoading(true);
    const res = await fetch('/api/send/bulk', { method: 'POST' });
    const data = await res.json();
    setMessage(`✅ Sent ${data.sent} emails successfully`);
    setBulkLoading(false);
    fetchCompanies();
  };

  const handleBulkApprove = async () => {
    setBulkLoading(true);
    for (const c of companies.filter(c => c.emailStatus === 'Draft Ready')) {
      await fetch(`/api/approve/${c.notionId}`, { method: 'POST' });
    }
    setBulkLoading(false);
    fetchCompanies();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Morning Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Review and send today's recruiter emails</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleBulkApprove}
            disabled={bulkLoading}
            className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            ✅ Approve All
          </button>
          <button
            onClick={handleBulkSend}
            disabled={bulkLoading}
            className="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {bulkLoading ? 'Sending...' : '🚀 Send All Approved'}
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-4 bg-green-900 border border-green-700 text-green-300 px-4 py-3 rounded-lg">
          {message}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {['Draft Ready', 'Approved', 'New', 'Redo', 'Sent', 'Rejected'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === s ? 'bg-white text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading companies...</div>
      ) : companies.length === 0 ? (
        <div className="text-center py-20 text-gray-500">No companies with status "{filter}"</div>
      ) : (
        <div className="grid gap-4">
          {companies.map(company => (
            <div key={company.notionId} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="font-semibold text-lg">{company.company}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[company.emailStatus ?? 'New'] ?? 'bg-gray-700'}`}>
                      {company.emailStatus ?? 'New'}
                    </span>
                    {company.companyType && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">{company.companyType}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap text-sm">
                    <span className="text-gray-400">{company.role} {company.salaryRange ? `· ${company.salaryRange} LPA` : ''} {company.location ? `· ${company.location}` : ''}</span>
                    <span className="text-gray-700">·</span>
                    {company.resumeStatus === 'custom' ? (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-900/40 flex items-center gap-1 shadow-sm">
                        📎 Custom Resume
                      </span>
                    ) : company.resumeStatus === 'global' ? (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-950 text-green-400 border border-green-900/40 flex items-center gap-1 shadow-sm">
                        📎 Global Resume
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-500 border border-amber-900/40 flex items-center gap-1 animate-pulse">
                        ⚠️ No Resume
                      </span>
                    )}
                  </div>
                  {company.emailSubject && (
                    <p className="text-blue-400 text-sm mt-2 font-medium">"{company.emailSubject}"</p>
                  )}
                  {company.emailDraft && (
                    <p className="text-gray-500 text-xs mt-1 line-clamp-2">{company.emailDraft.slice(0, 150)}...</p>
                  )}
                  {company.draftNotes && (
                    <p className="text-yellow-600 text-xs mt-1">{company.draftNotes}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 ml-4 min-w-[120px]">
                  <Link
                    href={`/company/${company.notionId}`}
                    className="bg-gray-800 hover:bg-gray-700 text-center px-3 py-1.5 rounded-lg text-xs font-medium"
                  >
                    👁 Preview
                  </Link>
                  {company.emailStatus === 'Draft Ready' && (
                    <button
                      onClick={() => handleAction(company.notionId, 'approve')}
                      disabled={actionLoading === company.notionId + 'approve'}
                      className="bg-green-800 hover:bg-green-700 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                    >
                      ✅ Approve
                    </button>
                  )}
                  {company.emailStatus === 'Approved' && (
                    <button
                      onClick={() => handleAction(company.notionId, 'send')}
                      disabled={actionLoading === company.notionId + 'send'}
                      className="bg-blue-800 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                    >
                      {actionLoading === company.notionId + 'send' ? '...' : '🚀 Send'}
                    </button>
                  )}
                  <button
                    onClick={() => handleAction(company.notionId, 'redo')}
                    disabled={actionLoading === company.notionId + 'redo'}
                    className="bg-yellow-900 hover:bg-yellow-800 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                  >
                    {actionLoading === company.notionId + 'redo' ? '...' : '🔄 Redo'}
                  </button>
                  <button
                    onClick={() => handleAction(company.notionId, 'reject')}
                    disabled={actionLoading === company.notionId + 'reject'}
                    className="bg-red-900 hover:bg-red-800 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
