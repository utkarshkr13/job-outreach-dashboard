import { NextResponse } from 'next/server';
import { getCompaniesByStatus, updateEmailDraft, getNotionConnection } from '@/lib/notion';
import { runAgentPipeline } from '@/lib/agents';
import { db } from '@/lib/firebase-admin';
import { decrypt } from '@/lib/crypto';
import { UserCredentials } from '@/lib/auth-middleware';
import { getErrorMessage } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = req.headers.get('authorization')?.replace('Bearer ', '') || url.searchParams.get('secret');

  if (process.env.NEXT_PUBLIC_APP_MODE !== 'demo' && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Fetch all Firestore users with cronEnabled = true
    const usersSnapshot = await db.collection('users')
      .where('settings.cronEnabled', '==', true)
      .get();

    const userResults = [];

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const userId = doc.id;
      const results = [];

      try {
        const credentials = userData.credentials || {};
        const profile = userData.profile || {};

        // Decrypt secrets for this user session in-memory
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

        if (!creds.notionApiKey || !creds.notionDbId) {
          userResults.push({ userId, success: false, error: 'User is missing Notion configuration.' });
          continue;
        }

        const connection = getNotionConnection(creds.notionApiKey, creds.notionDbId);
        const companies = await getCompaniesByStatus(connection, ['New', 'Redo']);

        for (const company of companies) {
          try {
            const result = await runAgentPipeline(company, creds);
            await updateEmailDraft(connection, company.notionId, result.subject, result.body, `Score: ${result.score}/10 — ${result.notes}`, 'Draft Ready');
            results.push({ company: company.company, success: true });

            // Small throttling delay to avoid Anthropic rate limits
            await new Promise(r => setTimeout(r, 1200));
          } catch (e) {
            results.push({ company: company.company, success: false, error: getErrorMessage(e) });
          }
        }

        userResults.push({ userId, success: true, processed: results.length, results });

      } catch (userErr) {
        console.error(`❌ Failed to run cron pipeline for user ${userId}:`, getErrorMessage(userErr));
        userResults.push({ userId, success: false, error: getErrorMessage(userErr) });
      }
    }

    return NextResponse.json({ success: true, usersProcessed: userResults.length, details: userResults });

  } catch (error) {
    console.error('❌ Multi-user Cron Error:', getErrorMessage(error));
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
