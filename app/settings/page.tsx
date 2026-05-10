'use client';

import { useState, useEffect, useRef } from 'react';

export default function SettingsPage() {
  const [currentResumeUrl, setCurrentResumeUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchResume();
  }, []);

  const fetchResume = async () => {
    try {
      const res = await fetch('/api/resume');
      const data = await res.json();
      if (data.url) {
        setCurrentResumeUrl(data.url);
      }
    } catch (err) {
      console.error('Failed to fetch resume', err);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    if (file.type !== 'application/pdf') {
      setMessage('Only PDF files are allowed.');
      return;
    }

    setIsUploading(true);
    setMessage('');

    try {
      const res = await fetch(`/api/resume/upload?filename=resume.pdf`, {
        method: 'POST',
        body: file,
      });

      if (!res.ok) throw new Error('Upload failed');
      
      await res.json();
      setCurrentResumeUrl('/api/resume/download');
      setMessage('Resume uploaded successfully!');
    } catch (err: any) {
      setMessage('Error: ' + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Settings</h1>
      
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Resume Configuration</h2>
        <p className="text-gray-400 mb-6 text-sm">
          Upload your resume in PDF format. This file will automatically be attached to all outgoing emails.
        </p>

        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="font-medium text-gray-300">Upload New Resume</label>
            <input 
              type="file" 
              accept="application/pdf"
              onChange={handleUpload}
              ref={fileInputRef}
              disabled={isUploading}
              className="block w-full text-sm text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-600 file:text-white
                hover:file:bg-blue-700
                file:cursor-pointer disabled:opacity-50"
            />
          </div>

          {isUploading && <p className="text-yellow-400 text-sm">Uploading...</p>}
          {message && <p className={`text-sm ${message.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>{message}</p>}

          <div className="mt-6 pt-6 border-t border-gray-800">
            <h3 className="font-medium text-gray-300 mb-2">Current Resume</h3>
            {currentResumeUrl ? (
              <div className="flex items-center gap-4">
                <a 
                  href={currentResumeUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  View Currently Uploaded Resume
                </a>
              </div>
            ) : (
              <p className="text-gray-500 italic">No resume uploaded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
