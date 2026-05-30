import { NextRequest, NextResponse } from 'next/server';
import { getCompanyById, updateEmailDraft } from '@/lib/notion';
import { mockGenerateFollowUp } from '@/lib/mockDb';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { notionId } = await req.json();
    if (!notionId) {
      return NextResponse.json({ error: 'Missing notionId' }, { status: 400 });
    }

    if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
      const result = mockGenerateFollowUp(notionId);
      return NextResponse.json({ success: true, result });
    }

    // Production Mode: Trigger Claude to write a second-touchpoint follow-up thread
    const company = await getCompanyById(notionId);
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const firstName = company.contactName ? company.contactName.trim().split(' ')[0] : 'there';
    
    const prompt = `Write a short, polite second-touchpoint follow-up email for job application.
The recruiter's name is ${firstName}, company is ${company.company}, and the targeted role is ${company.role}.
The follow-up should be extremely concise (2-3 sentences max) and refer back to your previous application, politely asking if they've had a chance to review it.
NO em dashes. NO fluff. Keep signature block.

Format of the follow-up:
Hi ${firstName},

[2 sentences politely checking in, referencing your Business Analyst background shipping end-to-end at an AI-first company]

Let me know if you have any availability for a quick call next week.

Utkarsh Kumar
+91 9969396063
linkedin.com/in/utkarsh-kumar-rajput-76b673232`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    const body = (response.content[0] as any).text;
    const subject = `Re: Associate PM / BA Interest at ${company.company} | Utkarsh Kumar`;

    // Save back to Notion with Draft Ready status so the user can review/edit
    await updateEmailDraft(notionId, subject, body, 'Score: 9.6. Approved (Follow-Up Cadence). Polished second-touchpoint email.', 'Draft Ready');

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
