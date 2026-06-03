import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function assertConfig() {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error(
      'Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* environment variables.'
    );
  }
}

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let analytics: Analytics | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (typeof window === 'undefined') {
    throw new Error('Firebase client is only available in the browser.');
  }
  assertConfig();
  if (!app) {
    app = getApps().length
      ? getApps()[0]
      : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}

export async function initAnalytics(): Promise<Analytics | null> {
  if (typeof window === 'undefined') return null;
  if (analytics) return analytics;
  if (!(await isSupported())) return null;
  analytics = getAnalytics(getFirebaseApp());
  return analytics;
}
