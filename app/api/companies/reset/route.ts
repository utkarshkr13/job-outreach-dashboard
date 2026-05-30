import { NextResponse } from 'next/server';
import { mockResetDb } from '@/lib/mockDb';
import { getAuthenticatedUser } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Authenticate user session
    await getAuthenticatedUser(req);

    if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
      mockResetDb();
      return NextResponse.json({ success: true, message: 'Database reset to default seed records successfully.' });
    }
    return NextResponse.json({ success: false, error: 'Database reset is only supported in Demo mode.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error resetting database:', error);
    const isAuthError = error.message.includes('Unauthorized') || error.message.includes('User not found');
    return NextResponse.json({ error: error.message }, { status: isAuthError ? 401 : 500 });
  }
}
