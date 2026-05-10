import { NextRequest, NextResponse } from 'next/server';
import { getCompaniesByStatus, updateEmailDraft } from '@/lib/notion';
import { runAgentPipeline } from '@/lib/agents';

export async function POST(req: NextRequest) {
  try {
    const companies = await getCompaniesByStatus('New');
    const results = [];

    for (const company of companies) {
      try {
        const result = await runAgentPipeline(company);
        await updateEmailDraft(company.notionId, result.subject, result.body, `Score: ${result.score}/10 — ${result.notes}`, 'Draft Ready');
        results.push({ company: company.company, success: true, score: result.score });
        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 1000));
      } catch (e: any) {
        results.push({ company: company.company, success: false, error: e.message });
      }
    }

    return NextResponse.json({ processed: results.length, results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
