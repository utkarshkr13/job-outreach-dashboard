import { NextResponse } from 'next/server';
import { getCompaniesByStatus, getNotionConnection, updateCompanyProperties } from '@/lib/notion';
import { db } from '@/lib/firebase-admin';
import { decrypt } from '@/lib/crypto';
import { UserCredentials } from '@/lib/auth-middleware';
import { getGmailAccessToken, getGmailThread, parseRecruiterReply } from '@/lib/gmail';

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
      let count = 0;

      for (const company of companies) {
        // Mock a 35% chance that a recruiter has replied in demo mode
        if (Math.random() > 0.65) {
          mockUpdateProperties(company.notionId, {
            emailStatus: 'Replied',
            replySnippet: 'Thanks for reaching out! Your Business Analyst experience shipping end-to-end at an AI startup looks very impressive. Would you be free to chat next Thursday?',
          });
          count++;
        }
      }
      return NextResponse.json({ success: true, mode: 'demo', repliesDetected: count });
    }

    const usersSnapshot = await db.collection('users')
      .where('settings.cronEnabled', '==', true)
      .get();

    let totalRepliesFound = 0;

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();

      try {
        const credentials = userData.credentials || {};
        const profile = userData.profile || {};

        const creds: UserCredentials = {
          notionApiKey: decrypt(credentials.notionApiKey || ''),
          notionDbId: decrypt(credentials.notionDbId || ''),
          anthropicApiKey: decrypt(credentials.anthropicApiKey || ''),
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

        if (!creds.notionApiKey || !creds.notionDbId || !creds.gmailRefreshToken) continue;

        const connection = getNotionConnection(creds.notionApiKey, creds.notionDbId);
        const sentCompanies = await getCompaniesByStatus(connection, 'Sent');

        const accessToken = await getGmailAccessToken({
          clientId: creds.gmailClientId,
          clientSecret: creds.gmailClientSecret,
          refreshToken: creds.gmailRefreshToken
        });

        for (const company of sentCompanies) {
          if (!company.gmailThreadId) continue;

          try {
            const threadData = await getGmailThread(company.gmailThreadId, accessToken);
            const { replyBody, hasReplied } = parseRecruiterReply(threadData, creds.gmailUser);

            if (hasReplied) {
              const snippet = replyBody.slice(0, 200).trim();
              
              await updateCompanyProperties(connection, company.notionId, {
                emailStatus: 'Replied',
                replySnippet: snippet
              });

              totalRepliesFound++;
            }
          } catch (e: any) {
            console.warn(`[REPLIES/SCAN] Failed to scan thread ${company.gmailThreadId} for company ${company.company}:`, e.message);
          }
        }
      } catch (err: any) {
        console.error(`❌ Replies scan sweep failed for user ${doc.id}:`, err.message);
      }
    }

    return NextResponse.json({ success: true, repliesFound: totalRepliesFound });
  } catch (error: any) {
    console.error('❌ POST /api/replies/scan error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
