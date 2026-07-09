import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import { generateCoverLetter } from '@/lib/agents';
import { safeErrorBody, safeErrorStatus } from '@/lib/api-errors';

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
    return NextResponse.json(safeErrorBody(e), { status: safeErrorStatus(e) });
  }
}
