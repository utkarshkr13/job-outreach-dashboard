import { NextResponse } from 'next/server';
import { getCompaniesByStatus, getNotionConnection, updateCompanyProperties } from '@/lib/notion';
import { db } from '@/lib/firebase-admin';
import { decrypt } from '@/lib/crypto';
import { UserCredentials } from '@/lib/auth-middleware';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const secret = req.headers.get('authorization')?.replace('Bearer ', '') || url.searchParams.get('secret');

  if (process.env.NEXT_PUBLIC_APP_MODE !== 'demo' && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
      const { getMockCompanies, mockUpdateProperties } = require('@/lib/mockDb');
      const companies = getMockCompanies('Sent');
      const now = new Date();
      let count = 0;

      for (const company of companies) {
        const lastContactedDate = company.lastContacted ? new Date(company.lastContacted) : new Date(company.dateAdded);
        const diffDays = Math.floor((now.getTime() - lastContactedDate.getTime()) / (1000 * 60 * 60 * 24));
        const fCount = company.followUpCount || 0;
        
        let threshold = 3;
        if (fCount === 1) threshold = 7;
        if (fCount === 2) threshold = 10;

        if (fCount < 3 && diffDays >= threshold) {
          const nextTouch = fCount + 1;
          mockUpdateProperties(company.notionId, {
            emailStatus: 'Follow-up Ready',
            emailSubject: `Re: ${company.emailSubject || 'Associate PM / BA Interest'}`,
            emailDraft: `Hi ${company.contactName?.split(' ')[0] || 'there'},\n\nI wanted to quickly check in on my original email below regarding the ${company.role} position. I'd love to connect for a 15-minute chat to discuss how my end-to-end sprint planning and BA ownership align with your current roadmaps.\n\nBest,\nUtkarsh Kumar`,
            draftNotes: `Score: 9.5/10 — Follow-up touchpoint ${nextTouch} drafted by cron sweep.`
          });
          count++;
        }
      }
      return NextResponse.json({ success: true, mode: 'demo', draftedCount: count });
    }

    const usersSnapshot = await db.collection('users')
      .where('settings.cronEnabled', '==', true)
      .get();

    let totalDrafted = 0;
    const now = new Date();

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const userId = doc.id;

      try {
        const credentials = userData.credentials || {};
        const profile = userData.profile || {};

        const creds: UserCredentials = {
          notionApiKey: decrypt(credentials.notionApiKey || ''),
          notionDbId: decrypt(credentials.notionDbId || ''),
          anthropicApiKey: decrypt(credentials.anthropicApiKey || ''),
          groqApiKey: decrypt(credentials.groqApiKey || ''),
          llmProvider: credentials.llmProvider || 'anthropic',
          gmailUser: credentials.gmailUser || '',
          gmailClientId: decrypt(credentials.gmailClientId || '') || process.env.GMAIL_PLATFORM_CLIENT_ID || '',
          gmailClientSecret: decrypt(credentials.gmailClientSecret || '') || process.env.GMAIL_PLATFORM_CLIENT_SECRET || '',
          gmailRefreshToken: decrypt(credentials.gmailRefreshToken || ''),
          senderName: profile.senderName || userData.name || 'Anonymous',
          senderPhone: profile.phone || '',
          senderLinkedin: profile.linkedin || '',
          senderBio: profile.bio || '',
          targetRoles: profile.targetRoles || 'Associate PM or Business Analyst',
          resumeBlobUrl: userData.resumeBlobUrl || '',
        };

        if (!creds.notionApiKey || !creds.notionDbId || !creds.anthropicApiKey) continue;

        const connection = getNotionConnection(creds.notionApiKey, creds.notionDbId);
        const companies = await getCompaniesByStatus(connection, 'Sent');
        const client = new Anthropic({ apiKey: creds.anthropicApiKey });

        for (const company of companies) {
          const lastContactedDate = company.lastContacted ? new Date(company.lastContacted) : new Date(company.dateAdded);
          const diffDays = Math.floor((now.getTime() - lastContactedDate.getTime()) / (1000 * 60 * 60 * 24));
          const fCount = company.followUpCount || 0;
          
          let threshold = 3;
          if (fCount === 1) threshold = 7;
          if (fCount === 2) threshold = 10;

          // Open-triggered sequence: if telemetry shows 2+ opens with no reply, trigger immediately!
          const openTrigger = (company.openCount ?? 0) >= 2 && fCount < 3;

          if (openTrigger || (fCount < 3 && diffDays >= threshold)) {
            const nextTouch = fCount + 1;
            const originalSubject = company.emailSubject || `Associate PM / BA Interest at ${company.company} | Utkarsh Kumar`;
            const signature = [creds.senderName, creds.senderPhone, creds.senderLinkedin].filter(Boolean).join('\n');

            const systemPrompt = `You write follow-up cold emails for job applications.

Context:
- Original email subject: ${originalSubject}
- Original email was sent ${diffDays} days ago with no reply
- This is follow-up number ${nextTouch} of 3
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

            const response = await client.messages.create({
              model: 'claude-3-5-sonnet-20241022',
              max_tokens: 512,
              system: systemPrompt,
              messages: [{ role: 'user', content: 'Generate follow-up email draft body.' }],
            });

            const body = (response.content[0] as any).text.trim();
            const subject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;

            await updateCompanyProperties(connection, company.notionId, {
              emailSubject: subject,
              emailDraft: body,
              emailStatus: 'Follow-up Ready',
              draftNotes: `Score: 9.6/10 — Follow-up ${nextTouch} drafted automatically by cron sweep (Opens: ${company.openCount ?? 0}).`,
            });

            totalDrafted++;
            // Small rate-limit throttling
            await new Promise(r => setTimeout(r, 1200));
          }
        }
      } catch (err: any) {
        console.error(`❌ Bulk follow-up sweep failed for user ${doc.id}:`, err.message);
      }
    }

    return NextResponse.json({ success: true, draftedCount: totalDrafted });
  } catch (error: any) {
    console.error('❌ POST /api/followup/bulk error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
