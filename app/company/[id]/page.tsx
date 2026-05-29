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
  
  // Custom resume states
  const [resumeStatus, setResumeStatus] = useState<'custom' | 'global' | 'none'>('none');
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeMsg, setResumeMsg] = useState('');

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

    // Fetch custom resume status for this company
    fetch(`/api/resume?companyId=${params.id}`)
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
      const res = await fetch(`/api/resume/upload?companyId=${params.id}&filename=custom-${params.id}.pdf`, {
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
    }
  };

  const handleDeleteCustomResume = async () => {
    if (!confirm('Are you sure you want to delete the custom resume override for this company? It will revert back to your global default resume.')) return;
    
    setUploadingResume(true);
    try {
      const res = await fetch(`/api/resume?companyId=${params.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      
      const checkRes = await fetch(`/api/resume?companyId=${params.id}`);
      const checkData = await checkRes.json();
      setResumeStatus(checkData.status);
      setResumeMsg('Custom resume removed. Reverted to default.');
    } catch (err: any) {
      setResumeMsg('Error: ' + err.message);
    } finally {
      setUploadingResume(false);
    }
  };

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

      {/* Custom Resume Overrides Widget */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Attachment Configuration</h2>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            {resumeStatus === 'custom' ? (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <span className="font-semibold text-blue-400 text-sm">📎 Company-Specific Resume Attached</span>
              </div>
            ) : resumeStatus === 'global' ? (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                <span className="font-semibold text-green-400 text-sm">📎 Global Default Resume Attached</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="font-semibold text-amber-500 text-sm">⚠️ No Resume Uploaded Yet</span>
              </div>
            )}
            <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">
              {resumeStatus === 'custom' 
                ? 'This company has a customized resume override. Sending this email will attach this specific PDF.' 
                : 'This company will receive your global default resume (uploaded in Settings) when sending.'}
            </p>
            {resumeMsg && <p className={`text-xs mt-2 ${resumeMsg.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>{resumeMsg}</p>}
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
              className="bg-gray-800 hover:bg-gray-700 text-center px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer border border-gray-700 select-none block w-full md:w-auto disabled:opacity-50"
            >
              {uploadingResume ? 'Uploading...' : '📎 Upload Custom PDF'}
            </label>
            {resumeStatus === 'custom' && (
              <button 
                onClick={handleDeleteCustomResume}
                disabled={uploadingResume}
                className="bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-900/50 px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                Delete Custom
              </button>
            )}
          </div>
        </div>
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
