import { NextResponse } from 'next/server';
import { getCompaniesByStatus, updateEmailDraft, getNotionConnection } from '@/lib/notion';
import { runAgentPipeline } from '@/lib/agents';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import { safeErrorBody, safeErrorStatus } from '@/lib/api-errors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  try {
    // 1. Authenticate user & load decrypted secrets
    const { userId, creds } = await getAuthenticatedUser(req);

    // Bulk operations hit external APIs (LLM/Gmail) repeatedly and are the
    // most expensive + most abuse-prone routes in the app — cap how often a
    // given user can trigger one.
    const rl = checkRateLimit(`${userId}:generate-bulk`, 3, 60000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const connection = getNotionConnection(creds.notionApiKey, creds.notionDbId);

    // 2. Query all 'New' status companies from the scoped Notion DB
    const companies = await getCompaniesByStatus(connection, 'New');
    const results = [];

    for (const company of companies) {
      try {
        const result = await runAgentPipeline(company, creds);
        await updateEmailDraft(connection, company.notionId, result.subject, result.body, `Score: ${result.score}/10 — ${result.notes}`, 'Draft Ready');
        results.push({ company: company.company, success: true, score: result.score });
        
        // Small throttling delay to safeguard Anthropic API rate boundaries
        await new Promise(r => setTimeout(r, 1000));
      } catch (e) {
        results.push({ company: company.company, success: false, error: getErrorMessage(e) });
      }
    }

    return NextResponse.json({ processed: results.length, results });
  } catch (e) {
    logger.error('POST /api/generate/bulk failed', e);
    return NextResponse.json(safeErrorBody(e), { status: safeErrorStatus(e) });
  }
}
