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
        <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-6">
          <span className="font-bold text-lg">📬 Job Outreach</span>
          <a href="/" className="text-gray-400 hover:text-white text-sm">Dashboard</a>
          <a href="/sent" className="text-gray-400 hover:text-white text-sm">Sent</a>
          <a href="/settings" className="text-gray-400 hover:text-white text-sm">Settings</a>
        </nav>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
