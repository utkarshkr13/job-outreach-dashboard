import { NextRequest, NextResponse } from 'next/server';
import { getCompaniesByStatus, updateEmailDraft, updateStatus } from '@/lib/notion';
import { runAgentPipeline } from '@/lib/agents';
import { getAllCompanies } from '@/lib/notion';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await updateStatus(id, 'Redo');
    const allCompanies = await getAllCompanies();
    const company = allCompanies.find(c => c.notionId === id);
    if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const result = await runAgentPipeline(company);
    await updateEmailDraft(id, result.subject, result.body, `Score: ${result.score}/10 — ${result.notes}`, 'Draft Ready');

    return NextResponse.json({ success: true, result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
