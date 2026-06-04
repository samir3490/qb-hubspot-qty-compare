import { NextRequest, NextResponse } from 'next/server';
import { runCompare } from '@/lib/compare';
import { getCronConfig } from '@/lib/cron-config';
import { sendMismatchAlert } from '@/lib/email/alert';
import { syncHubspotQuantitiesFromQuickbase } from '@/lib/hubspot-sync';
import { isCronAuthorized, isVercelCronRequest } from '@/lib/cron-auth';
import { getCronDiagnostics } from '@/lib/cron-diagnostics';
import {
  saveCompareRunAdmin,
  isAdminConfigured,
} from '@/lib/firebase/admin';

export const maxDuration = 120;

/**
 * Daily compare (Vercel Cron). Emails ALERT_EMAIL only when quantity mismatches exist.
 * Runs without user login — uses Firestore settings (CRON_FIREBASE_UID) or QB_/HUBSPOT_ env vars.
 * Auth: Authorization: Bearer CRON_SECRET (set automatically by Vercel Cron).
 */
export async function GET(request: NextRequest) {
  const isStatus = request.nextUrl.searchParams.get('status') === '1';

  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isStatus) {
    const diagnostics = await getCronDiagnostics();
    return NextResponse.json({ ok: true, ...diagnostics });
  }

  const config = await getCronConfig();
  if (
    !config?.quickbase.userToken ||
    !config.quickbase.qtyFieldId ||
    !config.hubspot.accessToken
  ) {
    const diagnostics = await getCronDiagnostics();
    console.error('Cron: config missing', diagnostics);
    return NextResponse.json(
      {
        error:
          'Cron config missing. Set CRON_FIREBASE_UID + FIREBASE_SERVICE_ACCOUNT_KEY on Vercel (and save settings in the app), or set QB_* / HUBSPOT_* env vars.',
        diagnostics,
      },
      { status: 500 }
    );
  }

  const triggeredBy = isVercelCronRequest(request) ? 'vercel-cron' : 'manual';

  try {
    console.log(`Cron compare starting (${triggeredBy})`);
    const result = await runCompare(config);
    const uid = process.env.CRON_FIREBASE_UID?.trim();

    if (uid && isAdminConfigured()) {
      try {
        await saveCompareRunAdmin(uid, result);
      } catch (e) {
        console.error('Cron: failed to save run to Firestore', e);
      }
    }

    let emailSent = false;
    let emailError: string | null = null;
    let syncResult: Awaited<
      ReturnType<typeof syncHubspotQuantitiesFromQuickbase>
    > | null = null;

    const autoSync =
      config.preferences?.autoSyncHubSpotOnDaily === true ||
      process.env.CRON_AUTO_SYNC_HUBSPOT === 'true';

    if (result.summary.mismatches > 0) {
      const mismatches = result.rows.filter((r) => r.status === 'mismatch');

      if (autoSync) {
        try {
          syncResult = await syncHubspotQuantitiesFromQuickbase(
            config.hubspot,
            mismatches
              .filter((r) => r.qbQty !== null && Number.isFinite(r.qbQty))
              .map((r) => ({ sku: r.sku, qbQty: r.qbQty as number }))
          );
        } catch (e) {
          console.error('Cron: HubSpot auto-sync failed', e);
        }
      }

      try {
        const emailResult = await sendMismatchAlert(result);
        emailSent = emailResult.sent;
      } catch (e) {
        emailError =
          e instanceof Error ? e.message : 'Failed to send mismatch email';
        console.error('Cron: email failed', emailError);
      }
    }

    console.log(
      `Cron compare done: mismatches=${result.summary.mismatches} emailSent=${emailSent}${emailError ? ` emailError=${emailError}` : ''}`
    );

    return NextResponse.json({
      ok: true,
      triggeredBy,
      summary: result.summary,
      mismatchCount: result.summary.mismatches,
      emailSent,
      emailError,
      alertEmail: emailSent ? process.env.ALERT_EMAIL : undefined,
      hubspotSync: syncResult,
      autoSyncEnabled: autoSync,
    });
  } catch (e) {
    console.error('Cron compare failed', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
