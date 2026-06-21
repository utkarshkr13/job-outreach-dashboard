import { NextResponse } from 'next/server';
import { adminAuth, db } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 });
    }

    // Support local/demo testing fallback
    if (
      process.env.NEXT_PUBLIC_APP_MODE === 'demo' || 
      !process.env.FIREBASE_SERVICE_ACCOUNT ||
      token === 'demo-token-123'
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

  } catch (error: any) {
    console.error('Session API Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
