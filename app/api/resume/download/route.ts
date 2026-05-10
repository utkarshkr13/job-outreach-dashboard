import { list } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { blobs } = await list();
    const resumeBlob = blobs.find(b => b.pathname === 'resume.pdf');
    
    if (resumeBlob) {
      const res = await fetch(resumeBlob.url, {
        headers: {
          Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch blob: ${res.statusText}`);
      }

      const buffer = await res.arrayBuffer();
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="resume.pdf"',
        },
      });
    } else {
      return new NextResponse('Not found', { status: 404 });
    }
  } catch (error: any) {
    console.error('Error fetching resume from Vercel Blob:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
