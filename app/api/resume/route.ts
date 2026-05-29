import { list } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');

  const isLocal = process.env.NEXT_PUBLIC_APP_MODE === 'demo' || !process.env.BLOB_READ_WRITE_TOKEN;

  if (isLocal) {
    const customPath = companyId ? path.join(process.cwd(), 'lib', 'resumes', `custom-${companyId}.pdf`) : '';
    const globalPath = path.join(process.cwd(), 'lib', 'resumes', 'global-resume.pdf');

    if (companyId && fs.existsSync(customPath)) {
      return NextResponse.json({
        url: `/api/resume/download?companyId=${companyId}`,
        status: 'custom',
        uploadedAt: fs.statSync(customPath).mtime.toISOString(),
      });
    } else if (fs.existsSync(globalPath)) {
      return NextResponse.json({
        url: '/api/resume/download',
        status: 'global',
        uploadedAt: fs.statSync(globalPath).mtime.toISOString(),
      });
    } else {
      return NextResponse.json({ url: null, status: 'none' });
    }
  }

  // Vercel Blob Production Fallback
  try {
    const { blobs } = await list();
    const customBlob = companyId ? blobs.find(b => b.pathname === `custom-${companyId}.pdf`) : null;
    const globalBlob = blobs.find(b => b.pathname === 'resume.pdf');

    if (companyId && customBlob) {
      return NextResponse.json({
        url: `/api/resume/download?companyId=${companyId}`,
        status: 'custom',
        uploadedAt: customBlob.uploadedAt,
      });
    } else if (globalBlob) {
      return NextResponse.json({
        url: '/api/resume/download',
        status: 'global',
        uploadedAt: globalBlob.uploadedAt,
      });
    } else {
      return NextResponse.json({ url: null, status: 'none' });
    }
  } catch (error: any) {
    console.error('Error fetching resume from Vercel Blob:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');

  if (!companyId) {
    return NextResponse.json({ error: 'Missing companyId' }, { status: 400 });
  }

  const isLocal = process.env.NEXT_PUBLIC_APP_MODE === 'demo' || !process.env.BLOB_READ_WRITE_TOKEN;

  if (isLocal) {
    const customPath = path.join(process.cwd(), 'lib', 'resumes', `custom-${companyId}.pdf`);
    try {
      if (fs.existsSync(customPath)) {
        fs.unlinkSync(customPath);
      }
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Vercel Blob Fallback
  try {
    const { del } = require('@vercel/blob');
    const { list } = require('@vercel/blob');
    const { blobs } = await list();
    const customBlob = blobs.find((b: any) => b.pathname === `custom-${companyId}.pdf`);
    
    if (customBlob) {
      await del(customBlob.url);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting custom resume from Vercel Blob:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
