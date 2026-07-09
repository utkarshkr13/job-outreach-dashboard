import { adminAuth, db } from './firebase-admin';
import { decrypt } from './crypto';

export interface UserCredentials {
  notionApiKey: string;
  notionDbId: string;
  anthropicApiKey: string;
  groqApiKey: string;
  llmProvider: 'anthropic' | 'groq';
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

  // Demo mode / local dev without Firebase secrets: any token (including the
  // well-known 'demo-token-123' used by the client) is accepted, but ONLY when
  // we are explicitly in demo mode or Firebase Admin isn't configured at all.
  // SECURITY: 'demo-token-123' must never be an independent bypass — it used to
  // be OR'd in as its own clause, which meant a live production deployment
  // (with FIREBASE_SERVICE_ACCOUNT set, not in demo mode) would still accept
  // that hardcoded, client-bundled token and hand back real platform-level
  // credentials. Removing it as a standalone condition closes that hole while
  // preserving legitimate demo/local-dev behaviour.
  if (
    process.env.NEXT_PUBLIC_APP_MODE === 'demo' ||
    !process.env.FIREBASE_SERVICE_ACCOUNT
  ) {
    return {
      userId: 'demo-user-id',
      creds: {
        notionApiKey: process.env.NOTION_API_KEY || 'demo-notion-api-key',
        notionDbId: process.env.NOTION_DB_ID || 'demo-notion-db-id',
        anthropicApiKey: process.env.ANTHROPIC_API_KEY || 'demo-anthropic-api-key',
        groqApiKey: process.env.GROQ_API_KEY || 'demo-groq-api-key',
        llmProvider: (process.env.PREFERRED_LLM_PROVIDER as any) || 'anthropic',
        gmailUser: process.env.GMAIL_USER || 'demo@gmail.com',
        gmailClientId: process.env.GMAIL_CLIENT_ID || 'demo-gmail-client-id',
        gmailClientSecret: process.env.GMAIL_CLIENT_SECRET || 'demo-gmail-client-secret',
        gmailRefreshToken: process.env.GMAIL_REFRESH_TOKEN || 'demo-gmail-refresh-token',
        senderName: 'Utkarsh Kumar',
        senderPhone: '+91 9969396063',
        senderLinkedin: 'linkedin.com/in/utkarsh-kumar-rajput-76b673232',
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

    const userData = userDoc.data()!;
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
        groqApiKey: decrypt(credentials.groqApiKey || ''),
        llmProvider: credentials.llmProvider || 'anthropic',
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
