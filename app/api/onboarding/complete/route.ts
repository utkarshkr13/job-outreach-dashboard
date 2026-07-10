import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import { db } from '@/lib/firebase-admin';
import { safeErrorBody, safeErrorStatus } from '@/lib/api-errors';
import { getErrorMessage } from '@/lib/errors';

export async function POST(req: Request) {
  try {
    const { userId } = await getAuthenticatedUser(req);

    const isFirebaseConfigured = !!process.env.FIREBASE_SERVICE_ACCOUNT;
    const isDemoMode = process.env.NEXT_PUBLIC_APP_MODE === 'demo' || userId === 'demo-user-id';

    if (!isDemoMode && isFirebaseConfigured) {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new Error('User document not initialized in database.');
      }

      await userRef.set({
        onboardingComplete: true,
      }, { merge: true });

      console.log(`✅ Onboarding completed successfully for user: ${userId}`);
    } else {
      console.log(`[DEMO MODE] Simulating onboarding completion for user: ${userId}`);
    }

    return NextResponse.json({ success: true, message: 'Onboarding completed.' });
  } catch (error) {
    console.error('❌ Complete onboarding route error:', getErrorMessage(error));
    return NextResponse.json({ success: false, ...safeErrorBody(error) }, { status: safeErrorStatus(error) });
  }
}
