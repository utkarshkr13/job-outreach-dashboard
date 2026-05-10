import { NextRequest, NextResponse } from 'next/server';
import { getCompaniesByStatus, updateEmailDraft } from '@/lib/notion';
import { runAgentPipeline } from '@/lib/agents';

export async function POST(req: NextRequest) {
  const { notionId } = await req.json();
  
  try {
    const companies = await getCompaniesByStatus(['New', 'Redo', 'Draft Ready', 'Rejected', 'Approved']);
    const company = companies.find(c => c.notionId === notionId);
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const result = await runAgentPipeline(company);
    await updateEmailDraft(notionId, result.subject, result.body, `Score: ${result.score}/10 — ${result.notes}`, 'Draft Ready');

    return NextResponse.json({ success: true, result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
