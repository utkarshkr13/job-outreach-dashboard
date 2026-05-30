import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import { db } from '@/lib/firebase-admin';

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');
  const filename = searchParams.get('filename') || 'resume.pdf';

  try {
    // 1. Authenticate user
    const { userId } = await getAuthenticatedUser(request);

    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json({ error: 'No file body provided' }, { status: 400 });
    }

    const isLocal = process.env.NEXT_PUBLIC_APP_MODE === 'demo' || !process.env.BLOB_READ_WRITE_TOKEN;
    const targetName = companyId ? `custom-${userId}-${companyId}.pdf` : `resume-${userId}.pdf`;

    if (isLocal) {
      const fs = require('fs');
      const path = require('path');
      const targetPath = path.join(process.cwd(), 'lib', 'resumes', targetName);
      
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, buffer);
      
      const downloadUrl = `/api/resume/download?userId=${userId}${companyId ? `&companyId=${companyId}` : ''}`;

      // If it's the main default resume, update the user's Firestore document
      const isFirebaseConfigured = !!process.env.FIREBASE_SERVICE_ACCOUNT;
      const isDemoMode = process.env.NEXT_PUBLIC_APP_MODE === 'demo' || userId === 'demo-user-id';

      if (!companyId && !isDemoMode && isFirebaseConfigured) {
        await db.collection('users').doc(userId).set({
          resumeBlobUrl: downloadUrl
        }, { merge: true });
      }

      return NextResponse.json({
        url: downloadUrl,
        pathname: targetName,
        contentType: 'application/pdf',
        size: buffer.length
      });
    }

    // Vercel Blob Production Upload
    let blob;
    try {
      blob = await put(targetName, buffer, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
    } catch (e: any) {
      if (e.message.includes('private store')) {
        blob = await put(targetName, buffer, {
          access: 'private',
          addRandomSuffix: false,
          allowOverwrite: true,
        });
      } else {
        throw e;
      }
    }

    // If it's the main default resume, update the user's Firestore document
    const isFirebaseConfigured = !!process.env.FIREBASE_SERVICE_ACCOUNT;
    const isDemoMode = process.env.NEXT_PUBLIC_APP_MODE === 'demo' || userId === 'demo-user-id';

    if (!companyId && !isDemoMode && isFirebaseConfigured) {
      await db.collection('users').doc(userId).set({
        resumeBlobUrl: blob.url
      }, { merge: true });
      console.log(`✅ Main resume URL stored for user ${userId}: ${blob.url}`);
    }

    return NextResponse.json(blob);
  } catch (error: any) {
    console.error('❌ Error uploading resume:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
