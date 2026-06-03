'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth, initAnalytics } from '@/lib/firebase/client';
import {
  loadConfigFromFirestore,
  saveConfigToFirestore,
} from '@/lib/firebase/firestore';
import type { ConnectionConfig } from '@/lib/types';
import { DEFAULT_CONFIG } from '@/lib/storage';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  config: ConnectionConfig;
  configLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  saveConfig: (config: ConnectionConfig) => Promise<void>;
  refreshConfig: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ConnectionConfig>(DEFAULT_CONFIG);
  const [configLoading, setConfigLoading] = useState(false);

  useEffect(() => {
    initAnalytics().catch(() => {});
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        setConfigLoading(true);
        try {
          const c = await loadConfigFromFirestore(u.uid);
          setConfig(c);
        } finally {
          setConfigLoading(false);
        }
      } else {
        setConfig(DEFAULT_CONFIG);
      }
    });
  }, []);

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  }

  async function signUp(email: string, password: string) {
    await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  }

  async function signOut() {
    await firebaseSignOut(getFirebaseAuth());
  }

  async function saveConfig(next: ConnectionConfig) {
    if (!user) throw new Error('Sign in to save settings.');
    await saveConfigToFirestore(user.uid, next);
    setConfig(next);
  }

  async function refreshConfig() {
    if (!user) return;
    setConfigLoading(true);
    try {
      const c = await loadConfigFromFirestore(user.uid);
      setConfig(c);
    } finally {
      setConfigLoading(false);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        config,
        configLoading,
        signIn,
        signUp,
        signOut,
        saveConfig,
        refreshConfig,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
