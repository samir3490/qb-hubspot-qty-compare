import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from './client';
import type { CompareResult, ConnectionConfig } from '../types';
import { DEFAULT_CONFIG } from '../storage';

const SETTINGS_DOC = 'config';

export interface StoredCompareRun {
  id: string;
  runAt: string;
  summary: CompareResult['summary'];
  mismatchCount: number;
  rows: CompareResult['rows'];
  createdAt?: Timestamp;
}

function userSettingsRef(uid: string) {
  return doc(getFirebaseDb(), 'qtyCompareUsers', uid, 'settings', SETTINGS_DOC);
}

function userRunsRef(uid: string) {
  return collection(getFirebaseDb(), 'qtyCompareUsers', uid, 'runs');
}

export async function loadConfigFromFirestore(
  uid: string
): Promise<ConnectionConfig> {
  const snap = await getDoc(userSettingsRef(uid));
  if (!snap.exists()) return { ...DEFAULT_CONFIG };
  const data = snap.data() as { config?: ConnectionConfig };
  if (!data.config) return { ...DEFAULT_CONFIG };
  return {
    ...DEFAULT_CONFIG,
    ...data.config,
    quickbase: { ...DEFAULT_CONFIG.quickbase, ...data.config.quickbase },
    hubspot: { ...DEFAULT_CONFIG.hubspot, ...data.config.hubspot },
  };
}

export async function saveConfigToFirestore(
  uid: string,
  config: ConnectionConfig
): Promise<void> {
  await setDoc(
    userSettingsRef(uid),
    {
      config,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function saveCompareRunToFirestore(
  uid: string,
  result: CompareResult
): Promise<string> {
  const runId = result.summary.runAt.replace(/[:.]/g, '-');
  const ref = doc(getFirebaseDb(), 'qtyCompareUsers', uid, 'runs', runId);
  await setDoc(ref, {
    runAt: result.summary.runAt,
    summary: result.summary,
    mismatchCount: result.summary.mismatches,
    rows: result.rows,
    createdAt: serverTimestamp(),
  });
  return runId;
}

export async function loadCompareHistory(
  uid: string,
  max = 30
): Promise<StoredCompareRun[]> {
  const q = query(userRunsRef(uid), orderBy('createdAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      runAt: data.runAt as string,
      summary: data.summary as CompareResult['summary'],
      mismatchCount: data.mismatchCount as number,
      rows: data.rows as CompareResult['rows'],
      createdAt: data.createdAt as Timestamp | undefined,
    };
  });
}

export async function loadCompareRun(
  uid: string,
  runId: string
): Promise<StoredCompareRun | null> {
  const ref = doc(getFirebaseDb(), 'qtyCompareUsers', uid, 'runs', runId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    runAt: data.runAt as string,
    summary: data.summary as CompareResult['summary'],
    mismatchCount: data.mismatchCount as number,
    rows: data.rows as CompareResult['rows'],
    createdAt: data.createdAt as Timestamp | undefined,
  };
}
