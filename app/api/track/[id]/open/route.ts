import { NextRequest, NextResponse } from 'next/server';
import { mockRegisterOpen } from '@/lib/mockDb';
import { Client } from '@notionhq/client';
import { db } from '@/lib/firebase-admin';
import { decrypt } from '@/lib/crypto';

export const dynamic = 'force-dynamic';

// 43-byte transparent 1x1 pixel GIF binary
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Extract user ID from tracking query parameter
  const userId = req.nextUrl.searchParams.get('u');

  try {
    const isDemo = process.env.NEXT_PUBLIC_APP_MODE === 'demo';

    if (isDemo || !userId) {
      // Local/Demo Mode fallback
      mockRegisterOpen(id);
      console.log(`[TRACKER] [DEMO] Registered open count for lead ${id}`);
    } else {
      // Production Multi-Tenant Mode: Retrieve and decrypt user credentials to update Notion
      try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
          throw new Error(`User ${userId} not found in Firestore.`);
        }

        const userData = userDoc.data()!;
        const apiKey = decrypt(userData.credentials?.notionApiKey || '');
        
        if (!apiKey) {
          throw new Error(`Notion API key not configured or failed to decrypt for user ${userId}`);
        }

        const notion = new Client({ auth: apiKey });

        // Query the current page to read open count
        const page: any = await notion.pages.retrieve({ page_id: id });
        const currentCountText = page.properties['Draft Notes']?.rich_text?.[0]?.text?.content ?? '';
        
        let count = 0;
        const match = currentCountText.match(/Opens: (\d+)/);
        if (match) {
          count = parseInt(match[1]);
        }
        count += 1;

        // Save back open logs in Draft Notes or custom properties
        await notion.pages.update({
          page_id: id,
          properties: {
            'Draft Notes': {
              rich_text: [{ text: { content: `${currentCountText.split('\n[Tracker]')[0]}\n[Tracker] Opens: ${count} (Last open: ${new Date().toISOString()})` } }]
            }
          }
        });
        console.log(`[TRACKER] Scoped open count successfully incremented to ${count} for lead ${id} (User: ${userId})`);
      } catch (err: any) {
        console.warn(`[TRACKER] Failed to update Notion open count for user ${userId}:`, err.message);
      }
    }
  } catch (e: any) {
    console.error('[TRACKER] Pixel tracker error:', e.message);
  }

  // Always return the transparent 1x1 tracking GIF immediately
  return new NextResponse(TRACKING_PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
