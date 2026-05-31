import { NextResponse } from 'next/server';
import { getCompaniesByStatus, updateStatus, getNotionConnection } from '@/lib/notion';
import { sendEmail } from '@/lib/mailer';
import { db } from '@/lib/firebase-admin';
import { decrypt } from '@/lib/crypto';
import { UserCredentials } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = req.headers.get('authorization')?.replace('Bearer ', '') || url.searchParams.get('secret');

  if (process.env.NEXT_PUBLIC_APP_MODE !== 'demo' && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
      // Offline Demo Mode Send Sweep
      const { getMockCompanies, mockUpdateStatus } = require('@/lib/mockDb');
      const companies = getMockCompanies('Scheduled');
      const nowStr = new Date().toISOString();
      const sent = [];

      for (const company of companies) {
        const scheduledTime = company.scheduledSendTime || '';
        if (scheduledTime && scheduledTime <= nowStr) {
          mockUpdateStatus(company.notionId, 'Sent');
          sent.push(company.company);
        }
      }
      return NextResponse.json({ success: true, mode: 'demo', sentCount: sent.length, sent });
    }

    // 1. Fetch all Firestore users with cronEnabled = true
    const usersSnapshot = await db.collection('users')
      .where('settings.cronEnabled', '==', true)
      .get();

    const userResults = [];
    const nowStr = new Date().toISOString();

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const userId = doc.id;
      const results = [];

      try {
        const credentials = userData.credentials || {};
        const profile = userData.profile || {};

        // Decrypt credentials
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
        const scheduledCompanies = await getCompaniesByStatus(connection, 'Scheduled');

        for (const company of scheduledCompanies) {
          const scheduledTime = company.scheduledSendTime || '';
          if (scheduledTime && scheduledTime <= nowStr) {
            try {
              if (!company.email) {
                results.push({ company: company.company, success: false, error: 'No email address' });
                continue;
              }

              // Send email
              await sendEmail({
                notionId: company.notionId,
                toEmail: company.email,
                subject: company.emailSubject,
                emailBody: company.emailDraft,
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

              await updateStatus(connection, company.notionId, 'Sent');
              results.push({ company: company.company, success: true });
            } catch (e: any) {
              results.push({ company: company.company, success: false, error: e.message });
            }
          }
        }
        userResults.push({ userId, processedCount: results.length, details: results });
      } catch (err: any) {
        console.error(`❌ Failed to sweep schedule for user ${userId}:`, err.message);
      }
    }

    return NextResponse.json({ success: true, usersSwept: userResults.length, details: userResults });

  } catch (error: any) {
    console.error('❌ Cron Scheduled Send Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
