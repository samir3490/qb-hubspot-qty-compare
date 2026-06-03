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
  lastSavedAt: Date | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  saveConfig: (config: ConnectionConfig) => Promise<Date>;
  refreshConfig: () => Promise<ConnectionConfig>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ConnectionConfig>(DEFAULT_CONFIG);
  const [configLoading, setConfigLoading] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  async function loadUserConfig(uid: string) {
    setConfigLoading(true);
    try {
      const { config: c, updatedAt } = await loadConfigFromFirestore(uid);
      setConfig(c);
      setLastSavedAt(updatedAt);
    } finally {
      setConfigLoading(false);
    }
  }

  useEffect(() => {
    initAnalytics().catch(() => {});
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        await loadUserConfig(u.uid);
      } else {
        setConfig(DEFAULT_CONFIG);
        setLastSavedAt(null);
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
    const savedAt = await saveConfigToFirestore(user.uid, next);
    setConfig(next);
    setLastSavedAt(savedAt);
    return savedAt;
  }

  async function refreshConfig(): Promise<ConnectionConfig> {
    if (!user) return config;
    const { config: c, updatedAt } = await loadConfigFromFirestore(user.uid);
    setConfig(c);
    setLastSavedAt(updatedAt);
    return c;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        config,
        configLoading,
        lastSavedAt,
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
