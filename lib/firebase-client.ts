import type { Auth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import type { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';

// Lazy Firebase factory — the full Firebase Auth SDK (~222KB) is loaded only
// when first needed (after initial render), not during page load.
// This removes Firebase from the critical render path and improves LCP.

export interface LazyFirebase {
  auth: Auth;
  GoogleAuthProvider: typeof GoogleAuthProvider;
  OAuthProvider: typeof OAuthProvider;
  onAuthStateChanged: typeof onAuthStateChanged;
  signInWithPopup: typeof signInWithPopup;
  signOut: typeof signOut;
}

let _cache: LazyFirebase | null = null;
let _promise: Promise<LazyFirebase> | null = null;

export async function getFirebase(): Promise<LazyFirebase> {
  if (_cache) return _cache;
  if (_promise) return _promise;

  _promise = (async (): Promise<LazyFirebase> => {
    const [{ initializeApp, getApps }, fb] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
    ]);

    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'placeholder-api-key',
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'placeholder-auth-domain',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'placeholder-project-id',
    };

    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      console.warn('⚠️ Firebase Client Configuration variables are missing. Auth flows might fail until configured.');
    }

    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

    _cache = {
      auth: fb.getAuth(app),
      GoogleAuthProvider: fb.GoogleAuthProvider,
      OAuthProvider: fb.OAuthProvider,
      onAuthStateChanged: fb.onAuthStateChanged,
      signInWithPopup: fb.signInWithPopup,
      signOut: fb.signOut,
    };
    return _cache;
  })();

  return _promise;
}
