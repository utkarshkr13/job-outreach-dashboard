import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import { db } from '@/lib/firebase-admin';
import { encrypt } from '@/lib/crypto';
import { Client } from '@notionhq/client';

export async function POST(req: Request) {
  try {
    const { userId } = await getAuthenticatedUser(req);
    const { notionApiKey, notionDbId } = await req.json();

    if (!notionApiKey || !notionDbId) {
      return NextResponse.json({ success: false, error: 'Notion API Key and Database ID are required.' }, { status: 400 });
    }

    // 1. Test the Notion Connection
    try {
      const notion = new Client({ auth: notionApiKey });
      await notion.databases.retrieve({ database_id: notionDbId });
    } catch (notionErr: any) {
      console.error('❌ Notion API Connection Test failed:', notionErr.message);
      return NextResponse.json({ 
        success: false, 
        error: `Could not connect to Notion: ${notionErr.message}. Please double-check your API Integration Token, Database ID, and ensure you have shared the database with your integration.` 
      }, { status: 400 });
    }

    // 2. Encrypt credentials and store in Firestore (except in demo/dev mode without active Firestore)
    const isFirebaseConfigured = !!process.env.FIREBASE_SERVICE_ACCOUNT;
    const isDemoMode = process.env.NEXT_PUBLIC_APP_MODE === 'demo' || userId === 'demo-user-id';

    if (!isDemoMode && isFirebaseConfigured) {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new Error('User document not initialized in database.');
      }

      const currentCreds = userDoc.data()?.credentials || {};
      const updatedCreds = {
        ...currentCreds,
        notionApiKey: encrypt(notionApiKey),
        notionDbId: encrypt(notionDbId),
      };

      await userRef.set({
        credentials: updatedCreds,
      }, { merge: true });

      console.log(`✅ Notion credentials tested and encrypted successfully for user: ${userId}`);
    } else {
      console.log(`[DEMO MODE] Simulating Notion credential write for user: ${userId}`);
    }

    return NextResponse.json({ success: true, message: 'Notion connection verified and stored successfully.' });
  } catch (error: any) {
    console.error('❌ Notion onboarding route error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
