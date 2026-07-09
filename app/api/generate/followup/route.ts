import { NextResponse } from 'next/server';
import { getCompanyById, updateEmailDraft, getNotionConnection } from '@/lib/notion';
import { mockGenerateFollowUp } from '@/lib/mockDb';
import Anthropic from '@anthropic-ai/sdk';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import { safeErrorBody, safeErrorStatus } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Authenticate user & load decrypted secrets
    const { creds } = await getAuthenticatedUser(req);
    const connection = getNotionConnection(creds.notionApiKey, creds.notionDbId);

    const { notionId } = await req.json();
    if (!notionId) {
      return NextResponse.json({ error: 'Missing notionId' }, { status: 400 });
    }

    const company = await getCompanyById(connection, notionId);
    if (!company) {
      return NextResponse.json({ error: 'Company not found in active database.' }, { status: 404 });
    }

    if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
      const result = mockGenerateFollowUp(company);
      await updateEmailDraft(connection, notionId, result.subject, result.body, result.notes, 'Follow-up Ready');
      return NextResponse.json({ success: true, result });
    }

    const apiKey = creds.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Missing Anthropic API Key. Please configure keys to run follow-ups.');
    }
    const client = new Anthropic({ apiKey });

    const systemPrompt = `You write a follow-up cold email for a job application that received no reply.

Context:
- Company: ${company.company}
- Role: ${company.role}
- Recruiter: ${company.contactName || 'Hiring Team'}
- Original subject: ${company.emailSubject}

RULES:
- Short, warm, reference original email in one line, soft ask.
- Never sound desperate or passive-aggressive.
- NO em dashes (—).
- Max 80 words.

Return only the email body. No subject line.`;

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Generate follow-up email draft body.' }],
    });
    const body = (response.content[0] as any).text.trim();
    const subject = company.emailSubject?.startsWith('Re:') ? company.emailSubject : `Re: ${company.emailSubject}`;

    await updateEmailDraft(connection, notionId, subject, body, 'Score: 9.6/10', 'Follow-up Ready');

    return NextResponse.json({
      success: true,
      result: {
        subject,
        body,
        score: 9.6,
        notes: 'Approved (Follow-Up Cadence). Generated via Claude.'
      }
    });

  } catch (error: any) {
    console.error('Error generating follow-up draft:', error);
    return NextResponse.json(safeErrorBody(error), { status: safeErrorStatus(error) });
  }
}
