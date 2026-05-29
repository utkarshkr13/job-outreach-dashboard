import { list } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const MINIMAL_PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF'
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');

  const isLocal = process.env.NEXT_PUBLIC_APP_MODE === 'demo' || !process.env.BLOB_READ_WRITE_TOKEN;

  if (isLocal) {
    const customPath = companyId ? path.join(process.cwd(), 'lib', 'resumes', `custom-${companyId}.pdf`) : '';
    const globalPath = path.join(process.cwd(), 'lib', 'resumes', 'global-resume.pdf');

    if (companyId && fs.existsSync(customPath)) {
      const buffer = fs.readFileSync(customPath);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="resume-${companyId}.pdf"`,
        },
      });
    } else if (fs.existsSync(globalPath)) {
      const buffer = fs.readFileSync(globalPath);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="resume.pdf"',
        },
      });
    } else {
      // Return a valid blank PDF block as a friendly placeholder in local dev
      return new NextResponse(MINIMAL_PDF, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="resume.pdf"',
        },
      });
    }
  }

  // Vercel Blob Production Fallback
  try {
    const { blobs } = await list();
    let resumeBlob = companyId ? blobs.find(b => b.pathname === `custom-${companyId}.pdf`) : null;
    if (!resumeBlob) {
      resumeBlob = blobs.find(b => b.pathname === 'resume.pdf');
    }
    
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
          'Content-Disposition': `inline; filename="${resumeBlob.pathname}"`,
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
