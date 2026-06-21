import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import { generateCompanyBrief } from '@/lib/agents';

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
    const isAuth = e.message?.includes('Unauthorized') || e.message?.includes('User not found');
    return NextResponse.json({ error: e.message }, { status: isAuth ? 401 : 500 });
  }
}
