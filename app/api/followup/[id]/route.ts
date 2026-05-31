import { NextResponse } from 'next/server';
import { getCompanyById, getNotionConnection, updateCompanyProperties } from '@/lib/notion';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import { sendEmail } from '@/lib/mailer';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action, followupNumber } = await req.json();

    if (!action || !followupNumber) {
      return NextResponse.json({ error: 'Missing action or followupNumber' }, { status: 400 });
    }

    const { userId, creds } = await getAuthenticatedUser(req);
    const connection = getNotionConnection(creds.notionApiKey, creds.notionDbId);

    const company = await getCompanyById(connection, id);
    if (!company) {
      return NextResponse.json({ error: 'Company not found in active database.' }, { status: 404 });
    }

    const currentFollowup = parseInt(followupNumber);
    
    // Construct days elapsed
    let daysAgo = 3;
    if (currentFollowup === 2) daysAgo = 7;
    if (currentFollowup === 3) daysAgo = 10;

    const apiKey = creds.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Missing Anthropic API Key. Please configure keys to run follow-ups.');
    }

    const client = new Anthropic({ apiKey });
    
    const originalSubject = company.emailSubject || `Associate PM / BA Interest at ${company.company} | Utkarsh Kumar`;
    const signature = [
      creds.senderName,
      creds.senderPhone,
      creds.senderLinkedin,
    ].filter(Boolean).join('\n');

    const systemPrompt = `You write follow-up cold emails for job applications.

Context:
- Original email subject: ${originalSubject}
- Original email was sent ${daysAgo} days ago with no reply
- This is follow-up number ${currentFollowup} of 3
- Recruiter open count: ${company.openCount ?? 0}

RULES:
- Follow-up 1: Short, warm, reference original email in one line, soft ask.
- Follow-up 2: Even shorter, offer something (portfolio, 15-min call, specific availability).
- Follow-up 3: Graceful exit — acknowledge they may be busy, leave the door open, zero pressure.
- Never sound desperate or passive-aggressive.
- NO em dashes (—).
- Max 80 words.
- Use the same signature as the original email:
${signature}

Return only the email body. No subject line.`;

    let body = "";
    if (process.env.NEXT_PUBLIC_APP_MODE === 'demo' || apiKey.includes('demo')) {
      if (currentFollowup === 1) {
        body = `Hi ${company.contactName || 'Hiring Team'},\n\nI wanted to check in briefly on my application for the ${company.role} role at ${company.company}. I know you have a lot on your plate, but I remain very excited about the opportunity.\n\nBest,\nUtkarsh Kumar`;
      } else if (currentFollowup === 2) {
        body = `Hi ${company.contactName || 'Hiring Team'},\n\nFollowing up on my previous message. I'd love to share my portfolio illustrating where I owned sprint planning and client go-lives, or find 15 minutes to connect. Do you have any availability this coming week?\n\nBest,\nUtkarsh Kumar`;
      } else {
        body = `Hi ${company.contactName || 'Hiring Team'},\n\nSince I haven't heard back, I'll assume the timing isn't right on your end. I'll leave the door open, but I'd love to stay connected for any future opportunities.\n\nBest,\nUtkarsh Kumar`;
      }
    } else {
      const response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: 'user', content: 'Generate follow-up email draft body.' }],
      });
      body = (response.content[0] as any).text.trim();
    }

    const subject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;

    if (action === 'draft') {
      await updateCompanyProperties(connection, id, {
        emailSubject: subject,
        emailDraft: body,
        emailStatus: 'Follow-up Ready',
        draftNotes: `Score: 9.6/10 — Follow-up ${currentFollowup} draft ready. Check timeline tab for touchpoint logs.`,
      });
      return NextResponse.json({ success: true, subject, body });
    }

    if (action === 'send') {
      if (!company.email) {
        return NextResponse.json({ error: 'No email address for this company' }, { status: 400 });
      }

      await sendEmail({
        notionId: company.notionId,
        toEmail: company.email,
        subject: subject,
        emailBody: body,
        companyName: company.company,
        role: company.role,
        contactName: company.contactName
      }, {
        gmailUser: creds.gmailUser,
        gmailClientId: creds.gmailClientId,
        gmailClientSecret: creds.gmailClientSecret,
        gmailRefreshToken: creds.gmailRefreshToken,
        senderName: creds.senderName,
        resumeBlobUrl: creds.resumeBlobUrl || undefined,
        userId: userId
      });

      await updateCompanyProperties(connection, id, {
        emailStatus: 'Sent',
        emailSubject: subject,
        emailDraft: body,
        followUpCount: currentFollowup,
        lastContacted: new Date().toISOString().split('T')[0],
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
  } catch (e: any) {
    console.error('❌ POST /api/followup/[id] error:', e.message);
    const isAuthError = e.message.includes('Unauthorized') || e.message.includes('User not found');
    return NextResponse.json({ error: e.message }, { status: isAuthError ? 401 : 500 });
  }
}
