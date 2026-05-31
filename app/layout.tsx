import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import Navbar from '@/app/components/Navbar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Outreach Platform',
  description: 'Automated cold email outreach powered by Claude AI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="transition-colors duration-300 min-h-screen bg-[#f5f5f7] dark:bg-[#000000] text-[#1d1d1f] dark:text-[#f5f5f7] antialiased">
        <AuthProvider>
          <Navbar />
          <main className="pt-20 pb-6 px-6 md:px-8 max-w-7xl mx-auto">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
