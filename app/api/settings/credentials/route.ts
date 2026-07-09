import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import { db } from '@/lib/firebase-admin';
import { encrypt } from '@/lib/crypto';
import { safeErrorBody, safeErrorStatus } from '@/lib/api-errors';

export async function GET(req: Request) {
  try {
    const { userId } = await getAuthenticatedUser(req);

    const isFirebaseConfigured = !!process.env.FIREBASE_SERVICE_ACCOUNT;
    const isDemoMode = process.env.NEXT_PUBLIC_APP_MODE === 'demo' || userId === 'demo-user-id';

    let profile = {
      senderName: 'Utkarsh Kumar',
      phone: '',
      linkedin: '',
      bio: '',
      targetRoles: 'Associate PM or Business Analyst',
    };

    let credentialsMasked = {
      gmailUser: 'ukumardj@gmail.com',
      gmailConnected: true,
      notionConnected: true,
      notionDbId: '••••••••••••••••',
      anthropicApiKeyConnected: true,
      groqApiKeyConnected: true,
      llmProvider: 'anthropic',
    };

    let resumeBlobUrl = '';
    let settings = { cronEnabled: true, cronHour: 4 };

    if (!isDemoMode && isFirebaseConfigured) {
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return NextResponse.json({ error: 'User document not found' }, { status: 404 });
      }

      const data = userDoc.data()!;
      const rawProfile = data.profile || {};
      const rawCreds = data.credentials || {};

      profile = {
        senderName: rawProfile.senderName || data.name || '',
        phone: rawProfile.phone || '',
        linkedin: rawProfile.linkedin || '',
        bio: rawProfile.bio || '',
        targetRoles: rawProfile.targetRoles || '',
      };

      credentialsMasked = {
        gmailUser: rawCreds.gmailUser || '',
        gmailConnected: !!rawCreds.gmailRefreshToken,
        notionConnected: !!rawCreds.notionApiKey,
        notionDbId: rawCreds.notionDbId ? '••••••••••••••••' : '',
        anthropicApiKeyConnected: !!rawCreds.anthropicApiKey,
        groqApiKeyConnected: !!rawCreds.groqApiKey,
        llmProvider: rawCreds.llmProvider || 'anthropic',
      };

      resumeBlobUrl = data.resumeBlobUrl || '';
      settings = data.settings || { cronEnabled: true, cronHour: 4 };
    }

    return NextResponse.json({
      success: true,
      profile,
      credentials: credentialsMasked,
      resumeBlobUrl,
      settings,
    });
  } catch (error: any) {
    console.error('❌ Settings GET credentials error:', error.message);
    return NextResponse.json({ success: false, ...safeErrorBody(error) }, { status: safeErrorStatus(error) });
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await getAuthenticatedUser(req);
    const body = await req.json();

    const isFirebaseConfigured = !!process.env.FIREBASE_SERVICE_ACCOUNT;
    const isDemoMode = process.env.NEXT_PUBLIC_APP_MODE === 'demo' || userId === 'demo-user-id';

    if (!isDemoMode && isFirebaseConfigured) {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return NextResponse.json({ error: 'User document not found' }, { status: 404 });
      }

      const existingData = userDoc.data()!;
      const existingCreds = existingData.credentials || {};
      const existingProfile = existingData.profile || {};

      const { profile: updatedProfile, credentials: inputCreds, settings: updatedSettings } = body;

      // 1. Process profile fields
      const newProfile = {
        ...existingProfile,
        ...(updatedProfile ? {
          senderName: updatedProfile.senderName || existingProfile.senderName || '',
          phone: updatedProfile.phone !== undefined ? updatedProfile.phone : existingProfile.phone || '',
          linkedin: updatedProfile.linkedin !== undefined ? updatedProfile.linkedin : existingProfile.linkedin || '',
          bio: updatedProfile.bio !== undefined ? updatedProfile.bio : existingProfile.bio || '',
          targetRoles: updatedProfile.targetRoles !== undefined ? updatedProfile.targetRoles : existingProfile.targetRoles || '',
        } : {}),
      };

      // 2. Process credentials (checking if they are masked placeholders)
      const newCreds = { ...existingCreds };
      
      if (inputCreds) {
        if (inputCreds.notionApiKey && inputCreds.notionApiKey !== '••••••••••••••••') {
          newCreds.notionApiKey = encrypt(inputCreds.notionApiKey);
        }
        if (inputCreds.notionDbId && inputCreds.notionDbId !== '••••••••••••••••') {
          newCreds.notionDbId = encrypt(inputCreds.notionDbId);
        }
        if (inputCreds.anthropicApiKey && inputCreds.anthropicApiKey !== '••••••••••••••••') {
          newCreds.anthropicApiKey = encrypt(inputCreds.anthropicApiKey);
        }
        if (inputCreds.groqApiKey && inputCreds.groqApiKey !== '••••••••••••••••') {
          newCreds.groqApiKey = encrypt(inputCreds.groqApiKey);
        }
        if (inputCreds.llmProvider) {
          newCreds.llmProvider = inputCreds.llmProvider;
        }
        // Let them also update Gmail user or other fields if explicitly sent
        if (inputCreds.gmailUser) {
          newCreds.gmailUser = inputCreds.gmailUser;
        }
      }

      // 3. Process settings fields
      const newSettings = {
        ...(existingData.settings || {}),
        ...(updatedSettings ? {
          cronEnabled: updatedSettings.cronEnabled !== undefined ? updatedSettings.cronEnabled : (existingData.settings?.cronEnabled ?? true),
          cronHour: updatedSettings.cronHour !== undefined ? Number(updatedSettings.cronHour) : (existingData.settings?.cronHour ?? 4),
        } : {}),
      };

      await userRef.set({
        profile: newProfile,
        credentials: newCreds,
        settings: newSettings,
        ...(newProfile.senderName ? { name: newProfile.senderName } : {}),
      }, { merge: true });

      console.log(`✅ Settings updated successfully for user: ${userId}`);
    } else {
      console.log(`[DEMO MODE] Simulating settings PUT write for user: ${userId}`, body);
    }

    return NextResponse.json({ success: true, message: 'Settings saved successfully.' });
  } catch (error: any) {
    console.error('❌ Settings PUT credentials error:', error.message);
    return NextResponse.json({ success: false, ...safeErrorBody(error) }, { status: safeErrorStatus(error) });
  }
}
