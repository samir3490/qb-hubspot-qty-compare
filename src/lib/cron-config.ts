import type { ConnectionConfig } from './types';
import { getConfigFromEnv } from './compare';
import { loadConfigFromAdmin, isAdminConfigured } from './firebase/admin';

/** Config for scheduled cron: Vercel env vars, or Firestore saved settings. */
export async function getCronConfig(): Promise<ConnectionConfig | null> {
  const fromEnv = getConfigFromEnv();
  const envComplete =
    fromEnv &&
    fromEnv.quickbase.userToken &&
    fromEnv.quickbase.qtyFieldId &&
    fromEnv.hubspot.accessToken;

  if (envComplete) return fromEnv;

  const uid = process.env.CRON_FIREBASE_UID;
  if (uid && isAdminConfigured()) {
    const fromFirestore = await loadConfigFromAdmin(uid);
    if (
      fromFirestore.quickbase.userToken &&
      fromFirestore.quickbase.qtyFieldId &&
      fromFirestore.hubspot.accessToken
    ) {
      return fromFirestore;
    }
  }

  return fromEnv;
}
