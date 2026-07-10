import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { safeErrorBody, safeErrorStatus } from '@/lib/api-errors';
import { getErrorMessage } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required to initiate Gmail OAuth.' }, { status: 400 });
    }

    let userId = 'demo-user-id';
    
    // Check if we are in true production mode or if Firebase Admin is configured
    const isFirebaseConfigured = !!process.env.FIREBASE_SERVICE_ACCOUNT;
    const isDemoMode = process.env.NEXT_PUBLIC_APP_MODE === 'demo';

    if (!isDemoMode && isFirebaseConfigured) {
      const decodedToken = await adminAuth.verifyIdToken(token);
      userId = decodedToken.uid;
    } else {
      console.warn('⚠️ Google OAuth in development/demo mode without active Firebase SDK verification.');
      // Allow 'demo-token-123' as fallback
      if (token !== 'demo-token-123') {
        userId = token; // Fallback to raw token if it is directly a user ID
      }
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const redirectUri = `${protocol}://${host}/api/gmail/oauth/callback`;

    const gmailClientId = process.env.GMAIL_PLATFORM_CLIENT_ID || process.env.GMAIL_CLIENT_ID;

    if (!gmailClientId) {
      return NextResponse.json({ 
        error: 'GMAIL_PLATFORM_CLIENT_ID (or GMAIL_CLIENT_ID) environment variable is not configured on the server.' 
      }, { status: 500 });
    }

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
      `client_id=${gmailClientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent('https://mail.google.com/ https://www.googleapis.com/auth/userinfo.email')}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${userId}`;

    return NextResponse.redirect(googleAuthUrl);
  } catch (error) {
    console.error('❌ Gmail OAuth initiation failed:', getErrorMessage(error));
    return NextResponse.json(safeErrorBody(error), { status: safeErrorStatus(error) });
  }
}
