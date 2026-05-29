import { list } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { isMockResumeUploaded } from '@/lib/mockDb';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
    if (isMockResumeUploaded()) {
      return NextResponse.json({
        url: '/api/resume/download',
        uploadedAt: new Date().toISOString()
      });
    } else {
      return NextResponse.json({ url: null });
    }
  }

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
