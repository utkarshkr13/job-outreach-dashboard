import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename') || 'resume.pdf';

  try {
    // Read the file buffer from the request body
    const body = await request.body;
    if (!body) {
      return NextResponse.json({ error: 'No file body provided' }, { status: 400 });
    }

    let blob;
    try {
      blob = await put(filename, body, {
        access: 'public',
        addRandomSuffix: false, // Override the same file every time
      });
    } catch (e: any) {
      if (e.message.includes('private store')) {
        // Fallback to private access
        blob = await put(filename, body, {
          access: 'private',
          addRandomSuffix: false,
        });
      } else {
        throw e;
      }
    }

    return NextResponse.json(blob);
  } catch (error: any) {
    console.error('Error uploading to Vercel Blob:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
