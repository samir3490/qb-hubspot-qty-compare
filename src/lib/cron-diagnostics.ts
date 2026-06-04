import { getAlertEmail } from './email/alert';
import { isAdminConfigured } from './firebase/admin';
import { getCronConfig } from './cron-config';
import { getCronSecret } from './cron-auth';

export async function getCronDiagnostics() {
  const uid = process.env.CRON_FIREBASE_UID?.trim();
  let configLoaded = false;
  let configSource: 'env' | 'firestore' | 'none' = 'none';
  let configError: string | null = null;

  try {
    const fromEnv =
      process.env.QB_USER_TOKEN &&
      process.env.QB_TABLE_ID &&
      process.env.HUBSPOT_ACCESS_TOKEN;

    const config = await getCronConfig();
    if (config?.quickbase.userToken && config.quickbase.qtyFieldId && config.hubspot.accessToken) {
      configLoaded = true;
      configSource = fromEnv ? 'env' : 'firestore';
    }
  } catch (e) {
    configError = e instanceof Error ? e.message : String(e);
  }

  return {
    ready:
      !!getCronSecret() &&
      configLoaded &&
      (!!process.env.RESEND_API_KEY ||
        (!!process.env.SMTP_USER?.trim() && !!process.env.SMTP_PASS?.trim())),
    cronSecretSet: !!getCronSecret(),
    cronFirebaseUidSet: !!uid,
    firebaseAdminConfigured: isAdminConfigured(),
    emailConfigured:
      !!process.env.RESEND_API_KEY ||
      (!!process.env.SMTP_USER?.trim() && !!process.env.SMTP_PASS?.trim()),
    alertEmail: getAlertEmail(),
    configLoaded,
    configSource,
    configError,
    schedule: '0 12 * * * (6:00 AM US Central / 12:00 UTC)',
  };
}
