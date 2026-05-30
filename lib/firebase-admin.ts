import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminAuth: any = null;
let db: any = null;

const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!getApps().length) {
  if (!serviceAccountEnv) {
    console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT env var is missing. Initializing with local projectId fallback.');
    try {
      initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'job-outreach-dashboard'
      });
    } catch (e: any) {
      console.error('❌ Failed to initialize fallback firebase app:', e.message);
    }
  } else {
    try {
      const serviceAccount = JSON.parse(serviceAccountEnv);
      initializeApp({
        credential: cert(serviceAccount)
      });
    } catch (error: any) {
      console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', error.message);
      try {
        initializeApp({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'job-outreach-dashboard'
        });
      } catch (e: any) {
        console.error('❌ Failed to initialize fallback app after JSON parse fail:', e.message);
      }
    }
  }
}

try {
  adminAuth = getAuth();
  db = getFirestore();
} catch (e: any) {
  console.error('❌ Failed to retrieve Firebase Admin instances:', e.message);
}

export { adminAuth, db };
