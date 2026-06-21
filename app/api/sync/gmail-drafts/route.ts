import { NextResponse } from 'next/server';
import { getNotionConnection } from '@/lib/notion';
import { getGmailAccessToken } from '@/lib/gmail';
import { getAuthenticatedUser } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

// Decode base64url → UTF-8 string
function decodeBase64url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

// Walk Gmail MIME payload to find plain-text body
function extractTextBody(payload: any): string {
  if (!payload) return '';

  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64url(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64url(part.body.data);
      }
    }
    for (const part of payload.parts) {
      const found = extractTextBody(part);
      if (found) return found;
    }
  }

  return '';
}

function getHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

// Extract company from "...at Razorpay | Utkarsh Kumar"
function extractCompanyFromSubject(subject: string): string | null {
  const match = subject.match(/\bat\s+(.+?)\s*\|\s*Utkarsh/i);
  if (match) return match[1].trim();
  return null;
}

// Pull "Hi Priya," → "Priya"
function extractFirstName(body: string): string {
  const match = body.match(/^Hi\s+([A-Za-z]+),/m);
  return match ? match[1] : '';
}

function isColdOutreachDraft(subject: string): boolean {
  return (
    subject.includes('Utkarsh Kumar') ||
    /associate pm/i.test(subject) ||
    /ba interest/i.test(subject) ||
    /business analyst/i.test(subject)
  );
}

export async function POST(req: Request) {
  try {
    const { creds } = await getAuthenticatedUser(req);

    if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
      return NextResponse.json({
        success: true, synced: 0, skipped: 0, total: 0,
        message: 'Gmail sync is disabled in demo mode.',
      });
    }

    // 1. Get Gmail access token
    const accessToken = await getGmailAccessToken({
      clientId: creds.gmailClientId,
      clientSecret: creds.gmailClientSecret,
      refreshToken: creds.gmailRefreshToken,
    });

    // 2. List all Gmail drafts
    const listRes = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/drafts?maxResults=100',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!listRes.ok) {
      throw new Error(`Failed to list Gmail drafts: ${await listRes.text()}`);
    }

    const listData = await listRes.json();
    const draftItems: { id: string }[] = listData.drafts ?? [];

    if (draftItems.length === 0) {
      return NextResponse.json({
        success: true, synced: 0, skipped: 0, total: 0,
        message: 'No drafts found in Gmail.',
      });
    }

    // 3. Notion connection for website's Cold Email Outreach DB
    const connection = getNotionConnection(creds.notionApiKey, creds.notionDbId);
    const notion = connection.notion;
    const DB_ID = connection.DB_ID;

    let synced = 0;
    let skipped = 0;
    const today = new Date().toISOString().split('T')[0];

    // 4. Process each draft
    for (const item of draftItems) {
      try {
        const draftRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${item.id}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!draftRes.ok) { skipped++; continue; }

        const draft = await draftRes.json();
        const message = draft.message;
        if (!message?.payload) { skipped++; continue; }

        const headers = message.payload.headers ?? [];
        const subject = getHeader(headers, 'Subject');
        const toEmail = getHeader(headers, 'To');

        if (!isColdOutreachDraft(subject)) { skipped++; continue; }

        const companyName = extractCompanyFromSubject(subject);
        if (!companyName) { skipped++; continue; }

        const emailBody = extractTextBody(message.payload);
        const contactName = extractFirstName(emailBody);

        // 5. Check if company already exists in Notion
        const existing = await notion.databases.query({
          database_id: DB_ID,
          filter: { property: 'Company', title: { equals: companyName } },
        });

        if (existing.results.length > 0) {
          const page = existing.results[0] as any;
          const currentStatus: string =
            page.properties['Email Status']?.select?.name ?? '';

          const dontTouch = ['Sent', 'Replied', 'Interview', 'Offer', 'Rejected'];
          if (dontTouch.includes(currentStatus)) { skipped++; continue; }

          await notion.pages.update({
            page_id: page.id,
            properties: {
              'Email Draft': { rich_text: [{ text: { content: emailBody.slice(0, 2000) } }] },
              'Email Subject': { rich_text: [{ text: { content: subject.slice(0, 2000) } }] },
              'Email Status': { select: { name: 'Draft Ready' } },
              ...(toEmail ? { Email: { email: toEmail } } : {}),
              ...(contactName ? { 'Contact Name': { rich_text: [{ text: { content: contactName } }] } } : {}),
            },
          });
          synced++;
        } else {
          await notion.pages.create({
            parent: { database_id: DB_ID },
            properties: {
              Company: { title: [{ text: { content: companyName } }] },
              Role: { rich_text: [{ text: { content: 'Associate PM / Business Analyst' } }] },
              Email: { email: toEmail || null },
              'Contact Name': { rich_text: [{ text: { content: contactName } }] },
              'Email Draft': { rich_text: [{ text: { content: emailBody.slice(0, 2000) } }] },
              'Email Subject': { rich_text: [{ text: { content: subject.slice(0, 2000) } }] },
              'Email Status': { select: { name: 'Draft Ready' } },
              'Date Added': { date: { start: today } },
              Source: { select: { name: 'Gmail Sync' } },
            },
          });
          synced++;
        }
      } catch (err: any) {
        console.warn(`[SYNC] Draft ${item.id} error:`, err.message);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      skipped,
      total: draftItems.length,
      message: `Synced ${synced} draft${synced !== 1 ? 's' : ''} to your dashboard.${skipped > 0 ? ` Skipped ${skipped}.` : ''}`,
    });

  } catch (error: any) {
    console.error('[SYNC] gmail-drafts error:', error);
    const isAuthError =
      error.message.includes('Unauthorized') || error.message.includes('User not found');
    return NextResponse.json({ error: error.message }, { status: isAuthError ? 401 : 500 });
  }
}