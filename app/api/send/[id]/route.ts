import { NextResponse } from 'next/server';
import { updateStatus, getCompanyById, getNotionConnection } from '@/lib/notion';
import { sendEmail } from '@/lib/mailer';
import { getAuthenticatedUser } from '@/lib/auth-middleware';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 1. Authenticate user & load decrypted secrets
    const { userId, creds } = await getAuthenticatedUser(req);
    const connection = getNotionConnection(creds.notionApiKey, creds.notionDbId);

    // 2. Fetch company lead from the scoped Notion DB
    const company = await getCompanyById(connection, id);
    if (!company) {
      return NextResponse.json({ error: 'Company not found in active database.' }, { status: 404 });
    }

    if (!company.email) {
      return NextResponse.json({ error: 'No email address for this company' }, { status: 400 });
    }

    // 3. Send email using the user's decrypted dynamic Gmail credentials and resume blobs
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
      userId: userId
    });

    let threadId = `mock-thread-${company.notionId}`;
    
    if (process.env.NEXT_PUBLIC_APP_MODE !== 'demo' && sendResult.messageId) {
      try {
        const { getGmailAccessToken, searchGmailMessageByRfcId } = require('@/lib/gmail');
        const token = await getGmailAccessToken({
          clientId: creds.gmailClientId,
          clientSecret: creds.gmailClientSecret,
          refreshToken: creds.gmailRefreshToken
        });
        const rfcId = sendResult.messageId.replace(/[<>]/g, '').trim();
        const resolvedThreadId = await searchGmailMessageByRfcId(rfcId, token);
        if (resolvedThreadId) {
          threadId = resolvedThreadId;
        }
      } catch (err: any) {
        console.warn('[API/SEND] Failed to resolve Thread ID for message:', err.message);
      }
    }

    const { updateCompanyProperties } = require('@/lib/notion');
    await updateCompanyProperties(connection, id, {
      emailStatus: 'Sent',
      gmailThreadId: threadId,
      lastContacted: new Date().toISOString().split('T')[0]
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('❌ POST /api/send/[id] error:', e.message);
    const isAuthError = e.message.includes('Unauthorized') || e.message.includes('User not found');
    return NextResponse.json({ error: e.message }, { status: isAuthError ? 401 : 500 });
  }
}