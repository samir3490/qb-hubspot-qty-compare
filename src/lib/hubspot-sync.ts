import type { ConnectionConfig } from './types';
import { parseHubspotApiError } from './hubspot-scopes';

export interface SyncQuantityItem {
  sku: string;
  qbQty: number;
}

export interface HubspotSyncResult {
  updated: number;
  skipped: number;
  failed: Array<{ sku: string; error: string }>;
  apiCalls: number;
}

const BATCH_SIZE = 100;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export async function syncHubspotQuantitiesFromQuickbase(
  hubspot: ConnectionConfig['hubspot'],
  items: SyncQuantityItem[]
): Promise<HubspotSyncResult> {
  const valid = items.filter(
    (i) => i.sku.trim() && i.qbQty !== null && Number.isFinite(i.qbQty)
  );

  let updated = 0;
  let skipped = items.length - valid.length;
  const failed: HubspotSyncResult['failed'] = [];
  let apiCalls = 0;

  const batches = chunk(valid, BATCH_SIZE);

  for (const batch of batches) {
    const body = {
      inputs: batch.map((item) => ({
        idProperty: hubspot.skuProperty,
        id: item.sku.trim(),
        properties: {
          [hubspot.skuProperty]: item.sku.trim(),
          [hubspot.qtyProperty]: String(item.qbQty),
        },
      })),
    };

    const url = `https://api.hubapi.com/crm/v3/objects/${hubspot.objectType}/batch/upsert`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hubspot.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    apiCalls += 1;

    if (!res.ok) {
      const text = await res.text();
      const err = parseHubspotApiError(res.status, text);
      for (const item of batch) {
        failed.push({ sku: item.sku, error: err });
      }
      continue;
    }

    const data = (await res.json()) as {
      results?: unknown[];
      errors?: Array<{ message?: string; context?: { ids?: string[] } }>;
    };

    updated += data.results?.length ?? batch.length;

    if (data.errors?.length) {
      for (const e of data.errors) {
        failed.push({
          sku: e.context?.ids?.[0] ?? 'unknown',
          error: e.message ?? 'HubSpot batch error',
        });
      }
    }
  }

  return { updated, skipped, failed, apiCalls };
}
