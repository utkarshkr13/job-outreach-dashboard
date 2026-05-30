import { NextResponse } from 'next/server';
import { updateEmailDraft, updateStatus, getAllCompanies, getNotionConnection } from '@/lib/notion';
import { runAgentPipeline } from '@/lib/agents';
import { getAuthenticatedUser } from '@/lib/auth-middleware';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 1. Authenticate user & load decrypted secrets
    const { creds } = await getAuthenticatedUser(req);
    const connection = getNotionConnection(creds.notionApiKey, creds.notionDbId);

    // 2. Perform redo operations dynamically inside the scoped DB
    await updateStatus(connection, id, 'Redo');
    const allCompanies = await getAllCompanies(connection);
    const company = allCompanies.find(c => c.notionId === id);
    if (!company) {
      return NextResponse.json({ error: 'Company not found in active database.' }, { status: 404 });
    }

    const result = await runAgentPipeline(company, creds);
    await updateEmailDraft(connection, id, result.subject, result.body, `Score: ${result.score}/10 — ${result.notes}`, 'Draft Ready');

    return NextResponse.json({ success: true, result });
  } catch (e: any) {
    console.error('❌ POST /api/redo/[id] error:', e.message);
    const isAuthError = e.message.includes('Unauthorized') || e.message.includes('User not found');
    return NextResponse.json({ error: e.message }, { status: isAuthError ? 401 : 500 });
  }
}
