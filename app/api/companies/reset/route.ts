import { NextRequest, NextResponse } from 'next/server';
import { mockResetDb } from '@/lib/mockDb';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
      mockResetDb();
      return NextResponse.json({ success: true, message: 'Database reset to default seed records successfully.' });
    }
    return NextResponse.json({ success: false, error: 'Database reset is only supported in Demo mode.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error resetting database:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
