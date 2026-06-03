import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import type { ConnectionConfig, CompareResult } from '../types';
import { DEFAULT_CONFIG } from '../storage';

let adminApp: App | undefined;
let adminDb: Firestore | undefined;

function initAdmin(): Firestore {
  if (adminDb) return adminDb;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY is not set (required to load saved settings for cron).'
    );
  }

  let serviceAccount: object;
  try {
    serviceAccount = JSON.parse(raw) as object;
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY must be valid JSON.');
  }

  if (!getApps().length) {
    adminApp = initializeApp({
      credential: cert(serviceAccount),
    });
  }

  adminDb = getFirestore(adminApp ?? getApps()[0]);
  return adminDb;
}

export async function loadConfigFromAdmin(
  uid: string
): Promise<ConnectionConfig> {
  const db = initAdmin();
  const snap = await db.doc(`qtyCompareUsers/${uid}/settings/config`).get();
  if (!snap.exists) return { ...DEFAULT_CONFIG };

  const data = snap.data() as { config?: ConnectionConfig };
  if (!data.config) return { ...DEFAULT_CONFIG };

  return {
    ...DEFAULT_CONFIG,
    ...data.config,
    quickbase: { ...DEFAULT_CONFIG.quickbase, ...data.config.quickbase },
    hubspot: { ...DEFAULT_CONFIG.hubspot, ...data.config.hubspot },
  };
}

export async function saveCompareRunAdmin(
  uid: string,
  result: CompareResult
): Promise<void> {
  const db = initAdmin();
  const runId = result.summary.runAt.replace(/[:.]/g, '-');
  await db.doc(`qtyCompareUsers/${uid}/runs/${runId}`).set({
    runAt: result.summary.runAt,
    summary: result.summary,
    mismatchCount: result.summary.mismatches,
    rows: result.rows,
    createdAt: new Date(),
    source: 'cron',
  });
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
}
