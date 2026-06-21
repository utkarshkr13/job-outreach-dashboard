import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import { generateCoverLetter } from '@/lib/agents';

// Read-only: generates cover letter text. Never writes to Notion.
export async function POST(req: Request) {
  try {
    const { creds } = await getAuthenticatedUser(req);
    const { company } = await req.json();
    if (!company?.company) {
      return NextResponse.json({ error: 'Missing company data' }, { status: 400 });
    }
    const text = await generateCoverLetter(company, creds);
    return NextResponse.json({ success: true, text });
  } catch (e: any) {
    console.error('❌ POST /api/cover-letter error:', e.message);
    const isAuth = e.message?.includes('Unauthorized') || e.message?.includes('User not found');
    return NextResponse.json({ error: e.message }, { status: isAuth ? 401 : 500 });
  }
}
