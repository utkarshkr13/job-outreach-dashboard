import { NextRequest, NextResponse } from 'next/server';
import { getCompaniesByStatus, updateEmailDraft } from '@/lib/notion';
import { runAgentPipeline } from '@/lib/agents';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Security check
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (process.env.NEXT_PUBLIC_APP_MODE !== 'demo' && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Process both New and Redo entries
    const companies = await getCompaniesByStatus(['New', 'Redo']);
    const results = [];

    for (const company of companies) {
      try {
        const result = await runAgentPipeline(company);
        await updateEmailDraft(company.notionId, result.subject, result.body, `Score: ${result.score}/10 — ${result.notes}`, 'Draft Ready');
        results.push({ company: company.company, success: true });
        await new Promise(r => setTimeout(r, 1500));
      } catch (e: any) {
        results.push({ company: company.company, success: false, error: e.message });
      }
    }

    return NextResponse.json({ processed: results.length, results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
