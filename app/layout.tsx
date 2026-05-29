import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Job Outreach Dashboard',
  description: 'Utkarsh — Daily recruiter email control panel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-white min-h-screen`}>
        <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-bold text-lg">📬 Job Outreach</span>
            <a href="/" className="text-gray-400 hover:text-white text-sm">Dashboard</a>
            <a href="/sent" className="text-gray-400 hover:text-white text-sm">Sent</a>
            <a href="/settings" className="text-gray-400 hover:text-white text-sm">Settings</a>
          </div>
          <div>
            {process.env.NEXT_PUBLIC_APP_MODE === 'demo' ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800 shadow-sm shadow-amber-900/50 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                Demo Environment
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 shadow-sm shadow-emerald-900/50 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Production Mode
              </span>
            )}
          </div>
        </nav>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
