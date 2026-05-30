import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import { db } from '@/lib/firebase-admin';
import { encrypt } from '@/lib/crypto';

export async function POST(req: Request) {
  try {
    const { userId } = await getAuthenticatedUser(req);
    const { name, phone, linkedin, bio, targetRoles, anthropicApiKey } = await req.json();

    if (!name || !bio || !targetRoles) {
      return NextResponse.json({ success: false, error: 'Full Name, Professional Bio, and Target Roles are required.' }, { status: 400 });
    }

    // Encrypt credentials and store in Firestore (except in demo/dev mode without active Firestore)
    const isFirebaseConfigured = !!process.env.FIREBASE_SERVICE_ACCOUNT;
    const isDemoMode = process.env.NEXT_PUBLIC_APP_MODE === 'demo' || userId === 'demo-user-id';

    if (!isDemoMode && isFirebaseConfigured) {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new Error('User document not initialized in database.');
      }

      const userData = userDoc.data()!;
      const currentCreds = userData.credentials || {};
      
      const updatedCreds = {
        ...currentCreds,
        anthropicApiKey: anthropicApiKey ? encrypt(anthropicApiKey) : (currentCreds.anthropicApiKey || ''),
      };

      const updatedProfile = {
        senderName: name,
        phone: phone || '',
        linkedin: linkedin || '',
        bio,
        targetRoles,
      };

      await userRef.set({
        credentials: updatedCreds,
        profile: updatedProfile,
        name: name, // Sync top-level user name too
      }, { merge: true });

      console.log(`✅ Profile and Claude API key saved securely for user: ${userId}`);
    } else {
      console.log(`[DEMO MODE] Simulating profile write for user: ${userId}`);
    }

    return NextResponse.json({ success: true, message: 'Profile saved successfully.' });
  } catch (error: any) {
    console.error('❌ Profile onboarding route error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
