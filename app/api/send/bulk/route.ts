import { NextResponse } from 'next/server';
import { getCompaniesByStatus, updateCompanyProperties, getNotionConnection } from '@/lib/notion';
import { sendEmail } from '@/lib/mailer';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import { safeErrorBody, safeErrorStatus } from '@/lib/api-errors';

export async function POST(req: Request) {
  try {
    // 1. Authenticate user & load decrypted secrets
    const { userId, creds } = await getAuthenticatedUser(req);
    const connection = getNotionConnection(creds.notionApiKey, creds.notionDbId);

    // 2. Fetch all approved leads from user's scoped DB
    const approved = await getCompaniesByStatus(connection, 'Approved');
    const results = [];
    const today = new Date().toISOString().split('T')[0];

    for (const company of approved) {
      if (!company.email) {
        results.push({ company: company.company, success: false, error: 'No email' });
        continue;
      }
      try {
        const sendResult = await sendEmail({
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
          userId
        });

        // Save Sent status + lastContacted so follow-up sequencing works correctly
        await updateCompanyProperties(connection, company.notionId, {
          emailStatus: 'Sent',
          lastContacted: today,
        });

        results.push({ company: company.company, success: true });

        // Throttling delay between sends to respect SMTP rate limits
        await new Promise(r => setTimeout(r, 500));
      } catch (e: any) {
        results.push({ company: company.company, success: false, error: e.message });
      }
    }

    return NextResponse.json({ sent: results.filter(r => r.success).length, results });
  } catch (e: any) {
    console.error('❌ POST /api/send/bulk error:', e.message);
    return NextResponse.json(safeErrorBody(e), { status: safeErrorStatus(e) });
  }
}
