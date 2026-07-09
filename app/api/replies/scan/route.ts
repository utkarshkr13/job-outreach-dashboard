import { NextResponse } from 'next/server';
import { getCompaniesByStatus, getNotionConnection, updateCompanyProperties } from '@/lib/notion';
import { db } from '@/lib/firebase-admin';
import { decrypt } from '@/lib/crypto';
import { UserCredentials } from '@/lib/auth-middleware';
import { getGmailAccessToken, getGmailThread, parseRecruiterReply } from '@/lib/gmail';
import { safeErrorBody } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

// Statuses that may have received a reply but haven't been classified yet
const SCAN_STATUSES = ['Sent', 'Follow-up Ready', 'No Response'] as const;

export async function POST(req: Request) {
  const url = new URL(req.url);
  const secret = req.headers.get('authorization')?.replace('Bearer ', '') || url.searchParams.get('secret');

  if (process.env.NEXT_PUBLIC_APP_MODE !== 'demo' && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
      const { getMockCompanies, mockUpdateProperties } = require('@/lib/mockDb');
      // Deterministic demo: mark companies whose name starts with A-M as replied
      const companies = getMockCompanies('Sent');
      let count = 0;
      for (const company of companies) {
        const firstChar = (company.company || '').charAt(0).toUpperCase();
        if (firstChar >= 'A' && firstChar <= 'M') {
          mockUpdateProperties(company.notionId, {
            emailStatus: 'Replied',
            replySnippet: 'Thanks for reaching out! Your Business Analyst experience looks impressive. Would you be free to chat next week?',
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

        if (!creds.notionApiKey || !creds.notionDbId || !creds.gmailRefreshToken) continue;

        const connection = getNotionConnection(creds.notionApiKey, creds.notionDbId);

        // Scan all statuses that could have received a recruiter reply
        const companies = await getCompaniesByStatus(connection, [...SCAN_STATUSES]);

        const accessToken = await getGmailAccessToken({
          clientId: creds.gmailClientId,
          clientSecret: creds.gmailClientSecret,
          refreshToken: creds.gmailRefreshToken
        });

        for (const company of companies) {
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
            console.warn(`[REPLIES/SCAN] Failed to scan thread ${company.gmailThreadId} for ${company.company}:`, e.message);
          }
        }
      } catch (err: any) {
        console.error(`❌ Replies scan sweep failed for user ${doc.id}:`, err.message);
      }
    }

    return NextResponse.json({ success: true, repliesFound: totalRepliesFound });
  } catch (error: any) {
    console.error('❌ POST /api/replies/scan error:', error.message);
    return NextResponse.json(safeErrorBody(error), { status: 500 });
  }
}
