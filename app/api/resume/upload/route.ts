import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { setMockResumeUploaded } from '@/lib/mockDb';

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename') || 'resume.pdf';

  if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
    setMockResumeUploaded(true);
    return NextResponse.json({
      url: '/api/resume/download',
      pathname: filename,
      contentType: 'application/pdf',
      size: 1024
    });
  }

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
        allowOverwrite: true,
      });
    } catch (e: any) {
      if (e.message.includes('private store')) {
        blob = await put(filename, buffer, {
          access: 'private',
          addRandomSuffix: false,
          allowOverwrite: true,
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
