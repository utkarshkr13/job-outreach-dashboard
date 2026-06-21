import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import Navbar from '@/app/components/Navbar';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';
import './ui-fixes.css';
import './design-system.css';

export const metadata: Metadata = {
  title: 'Outreach Platform',
  description: 'Automated cold email outreach powered by Claude AI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="transition-colors duration-300 min-h-screen bg-[#f5f5f7] dark:bg-[#000000] text-[#1d1d1f] dark:text-[#f5f5f7] antialiased">
        <AuthProvider>
          {/* Top fade so content scrolling under the floating navbar disappears cleanly */}
          <div className="fixed top-0 inset-x-0 h-20 z-40 pointer-events-none bg-gradient-to-b from-[#f5f5f7] via-[#f5f5f7]/90 to-transparent dark:from-black dark:via-black/90" />
          <Navbar />
          <main className="pt-24 pb-6 px-4 md:px-12 w-[96%] max-w-[96%] mx-auto">
            {children}
          </main>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
