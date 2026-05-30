import { NextResponse } from 'next/server';
import { getCompaniesByStatus, updateEmailDraft, getNotionConnection } from '@/lib/notion';
import { runAgentPipeline } from '@/lib/agents';
import { getAuthenticatedUser } from '@/lib/auth-middleware';

export async function POST(req: Request) {
  try {
    // 1. Authenticate user & load decrypted secrets
    const { creds } = await getAuthenticatedUser(req);
    const connection = getNotionConnection(creds.notionApiKey, creds.notionDbId);

    const { notionId } = await req.json();
    if (!notionId) {
      return NextResponse.json({ error: 'Missing notionId' }, { status: 400 });
    }

    // 2. Fetch specific company lead from the scoped Notion DB
    const companies = await getCompaniesByStatus(connection, ['New', 'Redo', 'Draft Ready', 'Rejected', 'Approved']);
    const company = companies.find(c => c.notionId === notionId);
    if (!company) {
      return NextResponse.json({ error: 'Company not found in active database.' }, { status: 404 });
    }

    // 3. Trigger dynamic Agent pipeline with user-specific keys and profile context
    const result = await runAgentPipeline(company, creds);
    await updateEmailDraft(connection, notionId, result.subject, result.body, `Score: ${result.score}/10 — ${result.notes}`, 'Draft Ready');

    return NextResponse.json({ success: true, result });
  } catch (e: any) {
    console.error('❌ POST /api/generate error:', e.message);
    const isAuthError = e.message.includes('Unauthorized') || e.message.includes('User not found');
    return NextResponse.json({ error: e.message }, { status: isAuthError ? 401 : 500 });
  }
}
