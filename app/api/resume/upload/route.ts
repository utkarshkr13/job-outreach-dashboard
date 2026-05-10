import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename') || 'resume.pdf';

  try {
    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json({ error: 'No file body provided' }, { status: 400 });
    }

    let blob;
    try {
      blob = await put(filename, buffer, {
        access: 'public',
        addRandomSuffix: false,
      });
    } catch (e: any) {
      if (e.message.includes('private store')) {
        blob = await put(filename, buffer, {
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
