'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  OAuthProvider, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { auth } from './firebase-client';
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

  // Helper to fetch onboarding status from session API
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
    if (user) {
      await fetchSessionStatus(user);
    }
  };

  useEffect(() => {
    // 1. If in local demo mode, bypass Firebase hooks
    if (isDemoMode) {
      const savedUser = localStorage.getItem('demo-user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);
          setOnboardingComplete(localStorage.getItem('demo-onboarding-complete') === 'true');
        } catch (e) {
          localStorage.removeItem('demo-user');
        }
      }
      setLoading(false);
      return;
    }

    // 2. Standard Firebase Auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const complete = await fetchSessionStatus(firebaseUser);
        
        // Sync to local storage for quick initial checks if needed
        localStorage.setItem('auth-user-connected', 'true');
      } else {
        setUser(null);
        setOnboardingComplete(false);
        localStorage.removeItem('auth-user-connected');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isDemoMode]);

  // Redirection Rules Middleware
  useEffect(() => {
    if (loading) return;

    const publicPaths = ['/login', '/marketing']; // list of public routes, we treat "/" as dashboard/marketing based on login status
    const isOnboarding = pathname === '/onboarding';
    const isLogin = pathname === '/login';

    if (!user) {
      // Unauthenticated users trying to access protected dashboard routes get sent to login
      if (!isLogin && pathname !== '/' && !publicPaths.includes(pathname)) {
        router.push('/login');
      }
    } else {
      // Authenticated users
      if (!onboardingComplete) {
        // Must complete onboarding before accessing dashboard pages
        if (!isOnboarding && pathname !== '/login') {
          router.push('/onboarding');
        }
      } else {
        // Onboarding complete: cannot access login or onboarding screens
        if (isLogin || isOnboarding) {
          router.push('/');
        }
      }
    }
  }, [user, onboardingComplete, loading, pathname, router]);

  const loginWithGoogle = async () => {
    if (isDemoMode) {
      await loginAsDemo();
      return;
    }
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('❌ Google sign-in failed:', error.message);
      setLoading(false);
      throw error;
    }
  };

  const loginWithApple = async () => {
    if (isDemoMode) {
      await loginAsDemo();
      return;
    }
    setLoading(true);
    try {
      const provider = new OAuthProvider('apple.com');
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('❌ Apple sign-in failed:', error.message);
      setLoading(false);
      throw error;
    }
  };

  const loginAsDemo = async () => {
    setLoading(true);
    const mockUser = {
      uid: 'demo-user-id',
      email: 'demo@gmail.com',
      displayName: 'Demo User',
      photoURL: null,
      emailVerified: true,
      getIdToken: () => Promise.resolve('demo-token-123'),
    } as unknown as User;

    setUser(mockUser);
    setOnboardingComplete(true);
    localStorage.setItem('demo-user', JSON.stringify({
      uid: mockUser.uid,
      email: mockUser.email,
      displayName: mockUser.displayName
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
      await firebaseSignOut(auth);
      router.push('/login');
    } catch (error: any) {
      console.error('❌ Sign out failed:', error.message);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        onboardingComplete,
        loginWithGoogle,
        loginWithApple,
        loginAsDemo,
        logout,
        refreshSessionStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
