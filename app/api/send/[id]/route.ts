import { NextResponse } from 'next/server';
import { getCompanyById, getNotionConnection, updateCompanyProperties } from '@/lib/notion';
import { sendEmail } from '@/lib/mailer';
import { getGmailAccessToken, searchGmailMessageByRfcId } from '@/lib/gmail';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import { safeErrorBody, safeErrorStatus } from '@/lib/api-errors';

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

    // Only set gmailThreadId when we actually resolve a real Gmail thread ID.
    // Previously this defaulted to a fabricated `mock-thread-...` value, which
    // got written to Notion and later fed straight into the real Gmail API by
    // /api/replies/scan (getGmailThread(company.gmailThreadId, ...)) — every
    // such lead would silently fail reply detection forever. Leaving it
    // undefined instead means updateCompanyProperties skips the field
    // (see lib/notion.ts's `if (properties.gmailThreadId !== undefined)` guard),
    // so replies/scan's `if (!company.gmailThreadId) continue;` correctly skips
    // it instead of querying a thread ID that will never exist.
    let threadId: string | undefined;

    if (process.env.NEXT_PUBLIC_APP_MODE !== 'demo' && sendResult.messageId) {
      try {
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
    } else if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
      // Demo mode has no real Gmail thread to resolve; keep a clearly-labelled
      // placeholder so the UI has something to display, without risking a
      // real API call against it later (replies/scan is also demo-gated).
      threadId = `demo-thread-${company.notionId}`;
    }

    await updateCompanyProperties(connection, id, {
      emailStatus: 'Sent',
      ...(threadId !== undefined ? { gmailThreadId: threadId } : {}),
      lastContacted: new Date().toISOString().split('T')[0]
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('❌ POST /api/send/[id] error:', e.message);
    return NextResponse.json(safeErrorBody(e), { status: safeErrorStatus(e) });
  }
}
