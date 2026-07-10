import { list } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import fs from 'fs';
import path from 'path';
import { safeErrorBody, safeErrorStatus } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');

  let userId = 'demo-user-id';
  try {
    const authContext = await getAuthenticatedUser(req);
    userId = authContext.userId;
  } catch (e) {
    // Non-blocking query param fallback
    userId = searchParams.get('userId') || 'demo-user-id';
  }

  const isLocal = process.env.NEXT_PUBLIC_APP_MODE === 'demo' || !process.env.BLOB_READ_WRITE_TOKEN;

  if (isLocal) {
    const customPath = companyId ? path.join(process.cwd(), 'lib', 'resumes', `custom-${userId}-${companyId}.pdf`) : '';
    const personalPath = path.join(process.cwd(), 'lib', 'resumes', `resume-${userId}.pdf`);
    const globalPath = path.join(process.cwd(), 'lib', 'resumes', 'global-resume.pdf');

    if (companyId && fs.existsSync(customPath)) {
      return NextResponse.json({
        url: `/api/resume/download?userId=${userId}&companyId=${companyId}`,
        status: 'custom',
        uploadedAt: fs.statSync(customPath).mtime.toISOString(),
      });
    } else if (fs.existsSync(personalPath)) {
      return NextResponse.json({
        url: `/api/resume/download?userId=${userId}`,
        status: 'personal',
        uploadedAt: fs.statSync(personalPath).mtime.toISOString(),
      });
    } else if (fs.existsSync(globalPath)) {
      return NextResponse.json({
        url: `/api/resume/download?userId=${userId}`,
        status: 'global',
        uploadedAt: fs.statSync(globalPath).mtime.toISOString(),
      });
    } else {
      return NextResponse.json({ url: null, status: 'none' });
    }
  }

  // Vercel Blob Production Scoped Fetch
  try {
    const { blobs } = await list();
    const customBlob = companyId ? blobs.find(b => b.pathname === `custom-${userId}-${companyId}.pdf`) : null;
    const personalBlob = blobs.find(b => b.pathname === `resume-${userId}.pdf`);
    const globalBlob = blobs.find(b => b.pathname === 'resume.pdf');

    if (companyId && customBlob) {
      return NextResponse.json({
        url: `/api/resume/download?companyId=${companyId}`,
        status: 'custom',
        uploadedAt: customBlob.uploadedAt,
      });
    } else if (personalBlob) {
      return NextResponse.json({
        url: `/api/resume/download`,
        status: 'personal',
        uploadedAt: personalBlob.uploadedAt,
      });
    } else if (globalBlob) {
      return NextResponse.json({
        url: `/api/resume/download`,
        status: 'global',
        uploadedAt: globalBlob.uploadedAt,
      });
    } else {
      return NextResponse.json({ url: null, status: 'none' });
    }
  } catch (error) {
    console.error('❌ Error fetching resume info from Vercel Blob:', error);
    return NextResponse.json(safeErrorBody(error), { status: safeErrorStatus(error) });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');

  if (!companyId) {
    return NextResponse.json({ error: 'Missing companyId' }, { status: 400 });
  }

  let userId = 'demo-user-id';
  try {
    const authContext = await getAuthenticatedUser(req);
    userId = authContext.userId;
  } catch (e) {
    userId = searchParams.get('userId') || 'demo-user-id';
  }

  const isLocal = process.env.NEXT_PUBLIC_APP_MODE === 'demo' || !process.env.BLOB_READ_WRITE_TOKEN;

  if (isLocal) {
    const customPath = path.join(process.cwd(), 'lib', 'resumes', `custom-${userId}-${companyId}.pdf`);
    try {
      if (fs.existsSync(customPath)) {
        fs.unlinkSync(customPath);
      }
      return NextResponse.json({ success: true });
    } catch (err) {
      return NextResponse.json(safeErrorBody(err), { status: safeErrorStatus(err) });
    }
  }

  // Vercel Blob Fallback
  try {
    const { del } = require('@vercel/blob');
    const { list } = require('@vercel/blob');
    const { blobs } = await list();
    const customBlob = blobs.find((b: any) => b.pathname === `custom-${userId}-${companyId}.pdf`);
    
    if (customBlob) {
      await del(customBlob.url);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting custom resume from Vercel Blob:', error);
    return NextResponse.json(safeErrorBody(error), { status: safeErrorStatus(error) });
  }
}
