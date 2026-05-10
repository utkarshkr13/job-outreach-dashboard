import { list } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { blobs } = await list();
    // Assuming we always upload the file as 'resume.pdf'
    const resumeBlob = blobs.find(b => b.pathname === 'resume.pdf');
    
    if (resumeBlob) {
      return NextResponse.json({ 
        url: '/api/resume/download', 
        uploadedAt: resumeBlob.uploadedAt 
      });
    } else {
      return NextResponse.json({ url: null });
    }
  } catch (error: any) {
    console.error('Error fetching resume from Vercel Blob:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
