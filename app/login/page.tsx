'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Login is handled entirely by the site password gate (/password).
 * This route only exists to redirect any old links to the dashboard.
 */
export default function LoginPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <p className="text-sm text-neutral-500">Redirecting…</p>
    </div>
  );
}
