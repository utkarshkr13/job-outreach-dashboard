'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { getFirebase } from './firebase-client';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  onboardingComplete: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  loginAsDemo: () => Promise<void>;
  logout: () => Promise<void>;
  refreshSessionStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();

  const isDemoMode = process.env.NEXT_PUBLIC_APP_MODE === 'demo';

  const fetchSessionStatus = async (firebaseUser: User) => {
    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (data.success && data.user) {
        setOnboardingComplete(data.user.onboardingComplete);
        return data.user.onboardingComplete;
      }
    } catch (error) {
      console.error('❌ Failed to verify session token:', error);
    }
    return false;
  };

  const refreshSessionStatus = async () => {
    if (user) await fetchSessionStatus(user);
  };

  useEffect(() => {
    // Demo mode — bypass Firebase entirely
    if (isDemoMode) {
      const savedUser = localStorage.getItem('demo-user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser({ ...parsed, getIdToken: () => Promise.resolve('demo-token-123') });
          setOnboardingComplete(localStorage.getItem('demo-onboarding-complete') === 'true');
        } catch {
          localStorage.removeItem('demo-user');
        }
      }
      setLoading(false);
      return;
    }

    // Lazy-load Firebase Auth and set up the auth state listener.
    // Firebase's ~222KB bundle loads AFTER the initial render, keeping it
    // off the critical path and improving Largest Contentful Paint (LCP).
    let unsubscribe: (() => void) | undefined;

    getFirebase().then(({ auth, onAuthStateChanged }) => {
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);
          await fetchSessionStatus(firebaseUser);
          localStorage.setItem('auth-user-connected', 'true');
        } else {
          setUser(null);
          setOnboardingComplete(false);
          localStorage.removeItem('auth-user-connected');
        }
        setLoading(false);
      });
    });

    return () => unsubscribe?.();
  }, [isDemoMode]);

  // Redirect rules
  useEffect(() => {
    if (loading) return;
    const publicPaths = ['/login', '/marketing'];
    const isOnboarding = pathname === '/onboarding';
    const isLogin = pathname === '/login';

    if (!user) {
      if (!isLogin && pathname !== '/' && !publicPaths.includes(pathname)) {
        router.push('/login');
      }
    } else {
      if (!onboardingComplete) {
        if (!isOnboarding && pathname !== '/login') router.push('/onboarding');
      } else {
        if (isLogin || isOnboarding) router.push('/');
      }
    }
  }, [user, onboardingComplete, loading, pathname, router]);

  const loginWithGoogle = async () => {
    setLoading(true);
    const firebaseConfigIsPlaceholder = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'placeholder-api-key';

    if (isDemoMode || firebaseConfigIsPlaceholder) {
      await loginAsDemo('Google User', 'google-user@gmail.com');
      return;
    }
    try {
      const { auth, signInWithPopup, GoogleAuthProvider } = await getFirebase();
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error: any) {
      console.warn('⚠️ Google popup auth failed. Falling back to sandbox session.', error.message);
      await loginAsDemo('Google User (Sandbox)', 'google-user@gmail.com');
    }
  };

  const loginWithApple = async () => {
    setLoading(true);
    const firebaseConfigIsPlaceholder = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'placeholder-api-key';

    if (isDemoMode || firebaseConfigIsPlaceholder) {
      await loginAsDemo('Apple User', 'apple-user@icloud.com');
      return;
    }
    try {
      const { auth, signInWithPopup, OAuthProvider } = await getFirebase();
      await signInWithPopup(auth, new OAuthProvider('apple.com'));
    } catch (error: any) {
      console.warn('⚠️ Apple ID popup auth failed. Falling back to sandbox session.', error.message);
      await loginAsDemo('Apple User (Sandbox)', 'apple-user@icloud.com');
    }
  };

  const loginAsDemo = async (customName = 'Demo User', customEmail = 'demo@gmail.com') => {
    setLoading(true);
    const mockUser = {
      uid: 'demo-user-id',
      email: customEmail,
      displayName: customName,
      photoURL: null,
      emailVerified: true,
      getIdToken: () => Promise.resolve('demo-token-123'),
    } as unknown as User;

    setUser(mockUser);
    setOnboardingComplete(true);
    localStorage.setItem('demo-user', JSON.stringify({
      uid: mockUser.uid,
      email: mockUser.email,
      displayName: mockUser.displayName,
    }));
    localStorage.setItem('demo-onboarding-complete', 'true');
    setLoading(false);
    router.push('/');
  };

  const logout = async () => {
    setLoading(true);
    if (isDemoMode) {
      setUser(null);
      setOnboardingComplete(false);
      localStorage.removeItem('demo-user');
      localStorage.removeItem('demo-onboarding-complete');
      setLoading(false);
      router.push('/login');
      return;
    }
    try {
      const { auth, signOut } = await getFirebase();
      await signOut(auth);
      router.push('/login');
    } catch (error: any) {
      console.error('❌ Sign out failed:', error.message);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, onboardingComplete, loginWithGoogle, loginWithApple, loginAsDemo, logout, refreshSessionStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
