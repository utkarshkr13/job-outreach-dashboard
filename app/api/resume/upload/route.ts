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

    const blob = await put(filename, body, {
      access: 'public',
      addRandomSuffix: false, // Override the same file every time
    });

    return NextResponse.json(blob);
  } catch (error: any) {
    console.error('Error uploading to Vercel Blob:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
