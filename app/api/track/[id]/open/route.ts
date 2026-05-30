import { NextRequest, NextResponse } from 'next/server';
import { mockRegisterOpen } from '@/lib/mockDb';
import { Client } from '@notionhq/client';

export const dynamic = 'force-dynamic';

// 43-byte transparent 1x1 pixel GIF binary
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const isLocal = process.env.NEXT_PUBLIC_APP_MODE === 'demo' || !process.env.NOTION_API_KEY;

    if (isLocal) {
      mockRegisterOpen(id);
    } else {
      // Production Mode: Update Notion open counts
      const notion = new Client({ auth: process.env.NOTION_API_KEY });
      try {
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
      } catch (err) {
        console.warn('[TRACKER] Failed to update Notion open count:', err);
      }
    }
  } catch (e) {
    console.error('[TRACKER] Pixel tracker error:', e);
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
