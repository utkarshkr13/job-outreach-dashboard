import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import { generateCompanyBrief } from '@/lib/agents';
import { safeErrorBody, safeErrorStatus } from '@/lib/api-errors';

// Read-only: generates a company intelligence brief. Never writes to Notion.
export async function POST(req: Request) {
  try {
    const { creds } = await getAuthenticatedUser(req);
    const { company } = await req.json();
    if (!company?.company) {
      return NextResponse.json({ error: 'Missing company data' }, { status: 400 });
    }
    const brief = await generateCompanyBrief(company, creds);
    return NextResponse.json({ success: true, brief });
  } catch (e: any) {
    console.error('❌ POST /api/brief error:', e.message);
    return NextResponse.json(safeErrorBody(e), { status: safeErrorStatus(e) });
  }
}
