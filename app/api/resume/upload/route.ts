import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { setMockResumeUploaded } from '@/lib/mockDb';

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');
  const filename = searchParams.get('filename') || 'resume.pdf';

  try {
    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json({ error: 'No file body provided' }, { status: 400 });
    }

    // Disk-Backed Storage (used in local development / demo mode, or when token is missing)
    const isLocal = process.env.NEXT_PUBLIC_APP_MODE === 'demo' || !process.env.BLOB_READ_WRITE_TOKEN;

    if (isLocal) {
      const fs = require('fs');
      const path = require('path');
      const targetName = companyId ? `custom-${companyId}.pdf` : 'global-resume.pdf';
      const targetPath = path.join(process.cwd(), 'lib', 'resumes', targetName);
      
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, buffer);
      
      if (!companyId) {
        setMockResumeUploaded(true);
      }

      return NextResponse.json({
        url: `/api/resume/download${companyId ? `?companyId=${companyId}` : ''}`,
        pathname: targetName,
        contentType: 'application/pdf',
        size: buffer.length
      });
    }

    // Vercel Blob Production Upload
    let blob;
    const blobName = companyId ? `custom-${companyId}.pdf` : 'resume.pdf';
    try {
      blob = await put(blobName, buffer, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
    } catch (e: any) {
      if (e.message.includes('private store')) {
        blob = await put(blobName, buffer, {
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
    console.error('Error uploading resume:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
