import { adminAuth, db } from './firebase-admin';
import { decrypt } from './crypto';

export interface UserCredentials {
  notionApiKey: string;
  notionDbId: string;
  anthropicApiKey: string;
  gmailUser: string;
  gmailClientId: string;
  gmailClientSecret: string;
  gmailRefreshToken: string;
  senderName: string;
  senderPhone: string;
  senderLinkedin: string;
  senderBio: string;
  targetRoles: string;
  resumeBlobUrl: string;
}

export async function getAuthenticatedUser(req: Request): Promise<{ userId: string; creds: UserCredentials }> {
  const authHeader = req.headers.get('Authorization');
  let token = authHeader?.replace('Bearer ', '');

  if (!token) {
    try {
      const url = new URL(req.url);
      token = url.searchParams.get('token') || undefined;
    } catch (e) {}
  }

  if (!token) {
    throw new Error('Unauthorized: Missing Authorization Bearer token.');
  }

  // Support demo mode or fallback for local development without Firebase secrets
  if (
    process.env.NEXT_PUBLIC_APP_MODE === 'demo' || 
    !process.env.FIREBASE_SERVICE_ACCOUNT ||
    token === 'demo-token-123'
  ) {
    return {
      userId: 'demo-user-id',
      creds: {
        notionApiKey: process.env.NOTION_API_KEY || 'demo-notion-api-key',
        notionDbId: process.env.NOTION_DB_ID || 'demo-notion-db-id',
        anthropicApiKey: process.env.ANTHROPIC_API_KEY || 'demo-anthropic-api-key',
        gmailUser: process.env.GMAIL_USER || 'demo@gmail.com',
        gmailClientId: process.env.GMAIL_CLIENT_ID || 'demo-gmail-client-id',
        gmailClientSecret: process.env.GMAIL_CLIENT_SECRET || 'demo-gmail-client-secret',
        gmailRefreshToken: process.env.GMAIL_REFRESH_TOKEN || 'demo-gmail-refresh-token',
        senderName: 'Utkarsh Kumar',
        senderPhone: '+91 9999999999',
        senderLinkedin: 'linkedin.com/in/utkarsh-kumar',
        senderBio: 'I am a Business Analyst who shipped end-to-end at an AI-first startup.',
        targetRoles: 'Associate PM or Business Analyst',
        resumeBlobUrl: '',
      }
    };
  }

  try {
    // 1. Verify the Firebase ID Token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // 2. Fetch the user's configuration document from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error('User document not found in database.');
    }

    const userData = userDoc.data();
    if (!userData) {
      throw new Error('User document is empty.');
    }

    const credentials = userData.credentials || {};
    const profile = userData.profile || {};

    // 3. Decrypt all sensitive client secrets using AES-256-CBC
    return {
      userId,
      creds: {
        notionApiKey: decrypt(credentials.notionApiKey || ''),
        notionDbId: decrypt(credentials.notionDbId || ''),
        anthropicApiKey: decrypt(credentials.anthropicApiKey || ''),
        gmailUser: credentials.gmailUser || '',
        // Use user-specific decrypted Gmail client ID/secret, or fallback to platform client ID/secret
        gmailClientId: decrypt(credentials.gmailClientId || '') || process.env.GMAIL_PLATFORM_CLIENT_ID || '',
        gmailClientSecret: decrypt(credentials.gmailClientSecret || '') || process.env.GMAIL_PLATFORM_CLIENT_SECRET || '',
        gmailRefreshToken: decrypt(credentials.gmailRefreshToken || ''),
        senderName: profile.senderName || userData.name || 'Anonymous User',
        senderPhone: profile.phone || '',
        senderLinkedin: profile.linkedin || '',
        senderBio: profile.bio || '',
        targetRoles: profile.targetRoles || 'Associate PM or Business Analyst',
        resumeBlobUrl: userData.resumeBlobUrl || '',
      }
    };
  } catch (error: any) {
    console.error('❌ Authentication verification failed:', error.message);
    throw new Error(`Unauthorized: ${error.message}`);
  }
}
