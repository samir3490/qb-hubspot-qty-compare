import { NextRequest, NextResponse } from 'next/server';
import { syncHubspotQuantitiesFromQuickbase } from '@/lib/hubspot-sync';
import type { CompareRow, ConnectionConfig } from '@/lib/types';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      config: ConnectionConfig;
      /** Sync only these SKUs with explicit QB quantities */
      items?: Array<{ sku: string; qbQty: number }>;
      /** Sync all mismatch rows from a compare result */
      mismatches?: CompareRow[];
    };

    const { config, items, mismatches } = body;

    if (!config?.hubspot?.accessToken) {
      return NextResponse.json(
        { error: 'HubSpot access token is required.' },
        { status: 400 }
      );
    }

    let syncItems: Array<{ sku: string; qbQty: number }> = [];

    if (items?.length) {
      syncItems = items.filter(
        (i) => i.qbQty !== null && Number.isFinite(i.qbQty)
      ) as Array<{ sku: string; qbQty: number }>;
    } else if (mismatches?.length) {
      syncItems = mismatches
        .filter(
          (r) =>
            r.status === 'mismatch' &&
            r.qbQty !== null &&
            Number.isFinite(r.qbQty)
        )
        .map((r) => ({ sku: r.sku, qbQty: r.qbQty as number }));
    } else {
      return NextResponse.json(
        { error: 'Provide items or mismatches to sync.' },
        { status: 400 }
      );
    }

    if (syncItems.length === 0) {
      return NextResponse.json(
        { error: 'No valid items to sync (need SKU + QuickBase quantity).' },
        { status: 400 }
      );
    }

    const result = await syncHubspotQuantitiesFromQuickbase(
      config.hubspot,
      syncItems
    );

    return NextResponse.json({
      ok: true,
      ...result,
      message: `Updated ${result.updated} product(s) in HubSpot from QuickBase quantities.`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
