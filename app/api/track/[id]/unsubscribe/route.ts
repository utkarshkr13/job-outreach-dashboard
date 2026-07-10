import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import { db } from '@/lib/firebase-admin';
import { decrypt } from '@/lib/crypto';
import { updateStatus, getNotionConnection } from '@/lib/notion';
import { getErrorMessage } from '@/lib/errors';

export const dynamic = 'force-dynamic';

function confirmationPage(message: string): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Unsubscribed</title>
    <style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1.5rem;color:#1d1d1f;line-height:1.5}</style>
    </head><body><h2>Unsubscribe request received</h2><p>${message}</p></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

// Public, unauthenticated endpoint — reached by a human clicking the
// unsubscribe link in an outreach email, not by the signed-in app owner.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = req.nextUrl.searchParams.get('u');

  try {
    const isDemo = process.env.NEXT_PUBLIC_APP_MODE === 'demo';

    if (isDemo || !userId) {
      const connection = getNotionConnection('', '');
      await updateStatus(connection, id, 'Rejected', `Unsubscribed via email link on ${new Date().toISOString()}`);
      console.log(`[UNSUBSCRIBE] [DEMO] Marked lead ${id} as unsubscribed`);
      return confirmationPage("You've been unsubscribed and won't receive further emails about this application.");
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error(`User ${userId} not found in Firestore.`);
    }

    const userData = userDoc.data()!;
    const apiKey = decrypt(userData.credentials?.notionApiKey || '');
    if (!apiKey) {
      throw new Error(`Notion API key not configured or failed to decrypt for user ${userId}`);
    }

    const connection = { notion: new Client({ auth: apiKey }), DB_ID: '' };
    await updateStatus(connection, id, 'Rejected', `Unsubscribed via email link on ${new Date().toISOString()}`);
    console.log(`[UNSUBSCRIBE] Marked lead ${id} as unsubscribed for user ${userId}`);

    return confirmationPage("You've been unsubscribed and won't receive further emails about this application.");
  } catch (e) {
    console.error('[UNSUBSCRIBE] Failed to process unsubscribe request:', getErrorMessage(e));
    // Still show a human-friendly page — the recipient shouldn't see a raw error.
    return confirmationPage('We received your request. If you continue to receive emails, please reply and let us know.');
  }
}
