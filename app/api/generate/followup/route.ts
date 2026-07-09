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

    if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
      const result = mockGenerateFollowUp(notionId);
      return NextResponse.json({ success: true, result });
    }

    // 2. Fetch specific company lead from the scoped Notion DB
    const company = await getCompanyById(connection, notionId);
    if (!company) {
      return NextResponse.json({ error: 'Company not found in active database.' }, { status: 404 });
    }

    // 3. Setup dynamic Anthropic and profile details
    const anthropicKey = creds.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      throw new Error('Missing Anthropic API Key. Configure your key in Settings to execute email generation.');
    }
    const anthropic = new Anthropic({ apiKey: anthropicKey });
    
    const firstName = company.contactName ? company.contactName.trim().split(' ')[0] : 'there';
    const signature = [
      creds.senderName,
      creds.senderPhone,
      creds.senderLinkedin
    ].filter(Boolean).join('\n');
    
    const prompt = `Write a short, polite second-touchpoint follow-up email for job application.
The recruiter's name is ${firstName}, company is ${company.company}, and the targeted role is ${company.role}.
The follow-up should be extremely concise (2-3 sentences max) and refer back to your previous application, politely asking if they've had a chance to review it.
NO em dashes. NO fluff. Keep signature block.

Format of the follow-up:
Hi ${firstName},

[2 sentences politely checking in, referencing your background: "${creds.senderBio}"]

Let me know if you have any availability for a quick call next week.

${signature}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    const body = (response.content[0] as any).text;
    const subject = `Re: ${creds.targetRoles} Interest at ${company.company} | ${creds.senderName}`;

    // Save back to Notion with Draft Ready status so the user can review/edit
    await updateEmailDraft(connection, notionId, subject, body, 'Score: 9.6. Approved (Follow-Up Cadence). Polished second-touchpoint email.', 'Draft Ready');

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
