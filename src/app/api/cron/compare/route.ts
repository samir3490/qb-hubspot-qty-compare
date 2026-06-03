import { NextRequest, NextResponse } from 'next/server';
import { runCompare } from '@/lib/compare';
import { getCronConfig } from '@/lib/cron-config';
import { sendMismatchAlert } from '@/lib/email/alert';
import {
  saveCompareRunAdmin,
  isAdminConfigured,
} from '@/lib/firebase/admin';

export const maxDuration = 60;

/**
 * Daily compare (Vercel Cron). Emails ALERT_EMAIL only when quantity mismatches exist.
 * Auth: Authorization: Bearer CRON_SECRET (set automatically by Vercel Cron).
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = await getCronConfig();
  if (
    !config?.quickbase.userToken ||
    !config.quickbase.qtyFieldId ||
    !config.hubspot.accessToken
  ) {
    return NextResponse.json(
      {
        error:
          'Cron config missing. Save settings in the app and set CRON_FIREBASE_UID + FIREBASE_SERVICE_ACCOUNT_KEY on Vercel, or set QB_* / HUBSPOT_* env vars.',
      },
      { status: 500 }
    );
  }

  try {
    const result = await runCompare(config);
    const uid = process.env.CRON_FIREBASE_UID;

    if (uid && isAdminConfigured()) {
      try {
        await saveCompareRunAdmin(uid, result);
      } catch (e) {
        console.error('Cron: failed to save run to Firestore', e);
      }
    }

    let emailResult = { sent: false, mismatchCount: 0 };
    if (result.summary.mismatches > 0) {
      emailResult = await sendMismatchAlert(result);
    }

    return NextResponse.json({
      ok: true,
      summary: result.summary,
      mismatchCount: result.summary.mismatches,
      emailSent: emailResult.sent,
      alertEmail: emailResult.sent ? process.env.ALERT_EMAIL : undefined,
    });
  } catch (e) {
    console.error('Cron compare failed', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
