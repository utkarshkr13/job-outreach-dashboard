'use client';
import { useEffect, useState } from 'react';
import { Company } from '@/types';

export default function SentPage() {
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    fetch('/api/companies?status=Sent').then(r => r.json()).then(setCompanies);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Sent Emails ({companies.length})</h1>
      <div className="grid gap-3">
        {companies.map(c => (
          <div key={c.notionId} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-semibold">{c.company}</h2>
                <p className="text-gray-400 text-sm">{c.role} · {c.email}</p>
                <p className="text-blue-400 text-sm mt-1">"{c.emailSubject}"</p>
              </div>
              <span className="text-xs text-gray-500">{c.dateAdded}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
