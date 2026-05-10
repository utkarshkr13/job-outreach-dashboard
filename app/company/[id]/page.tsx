'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Company } from '@/types';

export default function CompanyPage() {
  const params = useParams();
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [redoing, setRedoing] = useState(false);

  useEffect(() => {
    fetch('/api/companies').then(r => r.json()).then((data: Company[]) => {
      const c = data.find(x => x.notionId === params.id);
      if (c) {
        setCompany(c);
        setEditedSubject(c.emailSubject ?? '');
        setEditedBody(c.emailDraft ?? '');
      }
      setLoading(false);
    });
  }, [params.id]);

  const handleApproveAndSend = async () => {
    setSending(true);
    await fetch(`/api/approve/${params.id}`, { method: 'POST' });
    await fetch(`/api/send/${params.id}`, { method: 'POST' });
    setSending(false);
    router.push('/');
  };

  const handleRedo = async () => {
    setRedoing(true);
    const res = await fetch(`/api/redo/${params.id}`, { method: 'POST' });
    const data = await res.json();
    if (data.result) {
      setEditedSubject(data.result.subject);
      setEditedBody(data.result.body);
    }
    setRedoing(false);
  };

  const handleReject = async () => {
    await fetch(`/api/reject/${params.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'Manually rejected from preview' }) });
    router.push('/');
  };

  if (loading) return <div className="text-center py-20 text-gray-500">Loading...</div>;
  if (!company) return <div className="text-center py-20 text-gray-500">Company not found</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm mb-6">← Back</button>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h1 className="text-2xl font-bold mb-1">{company.company}</h1>
        <p className="text-gray-400">{company.role} · {company.location} · {company.salaryRange} LPA</p>
        {company.draftNotes && (
          <p className="mt-2 text-yellow-500 text-sm">{company.draftNotes}</p>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Email Subject</h2>
        <input
          value={editedSubject}
          onChange={e => setEditedSubject(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
          placeholder="Subject line..."
        />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Email Body</h2>
        <textarea
          value={editedBody}
          onChange={e => setEditedBody(e.target.value)}
          rows={14}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-mono text-sm resize-none"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleApproveAndSend}
          disabled={sending}
          className="flex-1 bg-blue-700 hover:bg-blue-600 py-3 rounded-xl font-semibold disabled:opacity-50"
        >
          {sending ? 'Sending...' : '🚀 Approve & Send Now'}
        </button>
        <button
          onClick={handleRedo}
          disabled={redoing}
          className="bg-yellow-900 hover:bg-yellow-800 px-6 py-3 rounded-xl font-semibold disabled:opacity-50"
        >
          {redoing ? 'Regenerating...' : '🔄 Redo'}
        </button>
        <button
          onClick={handleReject}
          className="bg-red-900 hover:bg-red-800 px-6 py-3 rounded-xl font-semibold"
        >
          ❌ Reject
        </button>
      </div>
    </div>
  );
}
