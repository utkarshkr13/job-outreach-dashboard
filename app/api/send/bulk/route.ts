import { NextResponse } from 'next/server';
import { getCompaniesByStatus, updateCompanyProperties, getNotionConnection } from '@/lib/notion';
import { sendEmail } from '@/lib/mailer';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import { safeErrorBody, safeErrorStatus } from '@/lib/api-errors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  try {
    // 1. Authenticate user & load decrypted secrets
    const { userId, creds } = await getAuthenticatedUser(req);

    // Bulk operations hit external APIs (LLM/Gmail) repeatedly and are the
    // most expensive + most abuse-prone routes in the app — cap how often a
    // given user can trigger one.
    const rl = checkRateLimit(`${userId}:send-bulk`, 3, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

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
      } catch (e) {
        results.push({ company: company.company, success: false, error: getErrorMessage(e) });
      }
    }

    return NextResponse.json({ sent: results.filter(r => r.success).length, results });
  } catch (e) {
    logger.error('POST /api/send/bulk failed', e);
    return NextResponse.json(safeErrorBody(e), { status: safeErrorStatus(e) });
  }
}
