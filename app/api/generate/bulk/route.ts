import { NextResponse } from 'next/server';
import { getCompaniesByStatus, updateEmailDraft, getNotionConnection } from '@/lib/notion';
import { runAgentPipeline } from '@/lib/agents';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import { safeErrorBody, safeErrorStatus } from '@/lib/api-errors';

export async function POST(req: Request) {
  try {
    // 1. Authenticate user & load decrypted secrets
    const { creds } = await getAuthenticatedUser(req);
    const connection = getNotionConnection(creds.notionApiKey, creds.notionDbId);

    const companies = await getCompaniesByStatus(connection, ['New', 'Redo']);
    const results: { company: string; success: boolean; score?: number; error?: string }[] = [];

    for (const company of companies) {
      try {
        const result = await runAgentPipeline(company, creds);
        await updateEmailDraft(connection, company.notionId, result.subject, result.body, `Score: ${result.score}/10 — ${result.notes}`, 'Draft Ready');
        results.push({ company: company.company, success: true, score: result.score });
        
        // Small throttling delay to safeguard Anthropic API rate boundaries
        await new Promise(r => setTimeout(r, 1000));
      } catch (e: any) {
        results.push({ company: company.company, success: false, error: e.message });
      }
    }

    return NextResponse.json({ processed: results.length, results });
  } catch (e: any) {
    console.error('❌ POST /api/generate/bulk error:', e.message);
    return NextResponse.json(safeErrorBody(e), { status: safeErrorStatus(e) });
  }
}
