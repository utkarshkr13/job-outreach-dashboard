import { NextResponse } from 'next/server';
import { getCompaniesByStatus, getNotionConnection, updateStatus } from '@/lib/notion';
import { db } from '@/lib/firebase-admin';
import { decrypt } from '@/lib/crypto';
import { UserCredentials } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const secret = req.headers.get('authorization')?.replace('Bearer ', '') || url.searchParams.get('secret');

  if (process.env.NEXT_PUBLIC_APP_MODE !== 'demo' && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
      const { getMockCompanies, mockUpdateStatus } = require('@/lib/mockDb');
      const companies = getMockCompanies('Sent');
      const now = new Date();
      let count = 0;

      for (const company of companies) {
        const lastContactedDate = company.lastContacted ? new Date(company.lastContacted) : new Date(company.dateAdded);
        const diffDays = Math.floor((now.getTime() - lastContactedDate.getTime()) / (1000 * 60 * 60 * 24));
        const fCount = company.followUpCount || 0;

        if (fCount === 3 && diffDays >= 14) {
          mockUpdateStatus(company.notionId, 'No Response');
          count++;
        }
      }
      return NextResponse.json({ success: true, mode: 'demo', archivedCount: count });
    }

    const usersSnapshot = await db.collection('users')
      .where('settings.cronEnabled', '==', true)
      .get();

    let totalArchived = 0;
    const now = new Date();

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

        if (!creds.notionApiKey || !creds.notionDbId) continue;

        const connection = getNotionConnection(creds.notionApiKey, creds.notionDbId);
        const companies = await getCompaniesByStatus(connection, 'Sent');

        for (const company of companies) {
          const lastContactedDate = company.lastContacted ? new Date(company.lastContacted) : new Date(company.dateAdded);
          const diffDays = Math.floor((now.getTime() - lastContactedDate.getTime()) / (1000 * 60 * 60 * 24));
          const fCount = company.followUpCount || 0;

          if (fCount === 3 && diffDays >= 14) {
            await updateStatus(connection, company.notionId, 'No Response');
            totalArchived++;
          }
        }
      } catch (err: any) {
        console.error(`❌ Follow-up archive sweep failed for user ${doc.id}:`, err.message);
      }
    }

    return NextResponse.json({ success: true, archivedCount: totalArchived });
  } catch (error: any) {
    console.error('❌ POST /api/followup/archive error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
