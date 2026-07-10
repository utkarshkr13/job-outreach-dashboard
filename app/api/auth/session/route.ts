import { NextResponse } from 'next/server';
import { adminAuth, db } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 });
    }

    // Support local/demo testing fallback.
    // SECURITY: do not OR in `token === 'demo-token-123'` as an independent
    // condition — that previously let anyone holding the (client-bundled,
    // publicly visible) demo token authenticate in a real production
    // deployment even when Firebase was fully configured.
    if (
      process.env.NEXT_PUBLIC_APP_MODE === 'demo' ||
      !process.env.FIREBASE_SERVICE_ACCOUNT
    ) {
      return NextResponse.json({
        success: true,
        user: {
          uid: 'demo-user-id',
          email: 'ukumardj@gmail.com',
          name: 'Utkarsh Kumar',
          onboardingComplete: true,
        }
      });
    }

    // 1. Verify token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // 2. Query/Create Firestore Document for the Tenant
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // Set initial user configuration skeleton to begin onboarding
      const newUser = {
        uid: userId,
        email: decodedToken.email || '',
        name: decodedToken.name || '',
        createdAt: new Date().toISOString(),
        onboardingComplete: false,
        profile: {
          phone: '',
          linkedin: '',
          bio: '',
          targetRoles: '',
          senderName: decodedToken.name || '',
        },
        credentials: {
          notionApiKey: '',
          notionDbId: '',
          anthropicApiKey: '',
          gmailUser: decodedToken.email || '',
          gmailRefreshToken: '',
        },
        resumeBlobUrl: '',
        settings: {
          cronEnabled: true,
          cronHour: 4,
        }
      };

      await userRef.set(newUser);

      return NextResponse.json({
        success: true,
        user: {
          uid: userId,
          email: decodedToken.email,
          name: decodedToken.name,
          onboardingComplete: false,
        }
      });
    }

    const userData = userDoc.data()!;
    return NextResponse.json({
      success: true,
      user: {
        uid: userId,
        email: userData.email,
        name: userData.name,
        onboardingComplete: userData.onboardingComplete || false,
      }
    });

  } catch (error) {
    // Log full detail server-side only; never forward internal error text
    // (which can include Firebase/library internals) to the client.
    console.error('Session API Error:', error);
    return NextResponse.json({ success: false, error: 'Authentication failed.' }, { status: 401 });
  }
}
