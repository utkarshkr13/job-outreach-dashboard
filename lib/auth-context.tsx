'use client';

import React, { createContext, useContext } from 'react';

/**
 * Single-user auth.
 *
 * The app is a personal, single-operator tool. Access is protected by the
 * site password gate (middleware + /password). Once past the gate, the user is
 * authenticated. There is no Google/Apple/Firebase login and no demo mode.
 *
 * All API calls run against the credentials configured in environment
 * variables (Notion / Gmail / AI), so the client just needs to present a stable
 * token; the server resolves the single operator account.
 */

interface LocalUser {
  uid: string;
  email: string;
  displayName: string;
  getIdToken: () => Promise<string>;
}

interface AuthContextType {
  user: LocalUser | null;
  loading: boolean;
  onboardingComplete: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  loginAsDemo: () => Promise<void>;
  logout: () => Promise<void>;
  refreshSessionStatus: () => Promise<void>;
}

const LOCAL_USER: LocalUser = {
  uid: 'local-user',
  email: 'operator@local',
  displayName: 'Operator',
  // Resolves to the single-operator server identity (env-configured credentials).
  getIdToken: async () => 'demo-token-123',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore network errors; we still redirect to the gate
    }
    window.location.href = '/password';
  };

  const noop = async () => {};

  return (
    <AuthContext.Provider
      value={{
        user: LOCAL_USER,
        loading: false,
        onboardingComplete: true,
        loginWithGoogle: noop,
        loginWithApple: noop,
        loginAsDemo: noop,
        logout,
        refreshSessionStatus: noop,
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
