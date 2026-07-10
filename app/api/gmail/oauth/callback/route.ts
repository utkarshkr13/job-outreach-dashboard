import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { encrypt } from '@/lib/crypto';
import { getErrorMessage } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const userId = searchParams.get('state'); // State contains userId
  const error = searchParams.get('error');

  const host = req.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/gmail/oauth/callback`;

  if (error) {
    console.error('❌ Google OAuth callback error parameter:', error);
    return NextResponse.redirect(`${protocol}://${host}/onboarding?step=2&error=${encodeURIComponent(error)}`);
  }

  if (!code || !userId) {
    return NextResponse.redirect(`${protocol}://${host}/onboarding?step=2&error=${encodeURIComponent('Missing authorization code or user session state.')}`);
  }

  try {
    const gmailClientId = process.env.GMAIL_PLATFORM_CLIENT_ID || process.env.GMAIL_CLIENT_ID;
    const gmailClientSecret = process.env.GMAIL_PLATFORM_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET;

    if (!gmailClientId || !gmailClientSecret) {
      throw new Error('Server-side GMAIL_PLATFORM credentials are not configured.');
    }

    // 1. Exchange authorization code for refresh token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: gmailClientId,
        client_secret: gmailClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange OAuth code.');
    }

    const { access_token, refresh_token } = tokenData;

    if (!refresh_token) {
      console.warn('⚠️ Google did not return a refresh token. Proceeding with existing if already present, but consent might need to be re-granted.');
    }

    // 2. Fetch email address of connected Gmail account
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const userData = await userResponse.json();
    const gmailEmail = userData.email;

    if (!gmailEmail) {
      throw new Error('Could not retrieve connected Gmail user profile email.');
    }

    // 3. Encrypt credentials and store in Firestore (except in demo/dev mode without active Firestore)
    const isFirebaseConfigured = !!process.env.FIREBASE_SERVICE_ACCOUNT;
    const isDemoMode = process.env.NEXT_PUBLIC_APP_MODE === 'demo' || userId === 'demo-user-id';

    if (!isDemoMode && isFirebaseConfigured) {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new Error('User document not initialized in database.');
      }

      // Update specific credential fields. Avoid overwriting others.
      const currentCreds = userDoc.data()?.credentials || {};
      
      const updatedCreds = {
        ...currentCreds,
        gmailUser: gmailEmail,
        // Only update refresh token if Google sent a new one
        ...(refresh_token ? { gmailRefreshToken: encrypt(refresh_token) } : {}),
      };

      await userRef.set({
        credentials: updatedCreds,
      }, { merge: true });

      console.log(`✅ Scoped Gmail credentials saved securely for user: ${userId} (${gmailEmail})`);
    } else {
      console.log(`[DEMO MODE] Simulating secure Gmail token write for user: ${userId} (${gmailEmail})`);
      // Update local storage / mock state if necessary, otherwise just log
    }

    // Redirect to step 2 with success
    return NextResponse.redirect(`${protocol}://${host}/onboarding?step=2&success=true&email=${encodeURIComponent(gmailEmail)}`);
  } catch (err) {
    console.error('❌ Google OAuth callback processing failed:', getErrorMessage(err));
    return NextResponse.redirect(`${protocol}://${host}/onboarding?step=2&error=${encodeURIComponent(getErrorMessage(err))}`);
  }
}
