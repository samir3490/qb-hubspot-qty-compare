import type { ConnectionConfig } from './types';
import { EXCLUDED_PRODUCT_FAMILIES } from './types';

export interface QuickbaseItemRow {
  sku: string;
  qty: number | null;
  productFamily: string;
  itemName: string;
  recordId: string;
  active: string;
}

function parseQty(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const s = String(value).trim();
  if (!s) return null;
  const n = Number(s.replace(/[$,]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function fieldValue(record: Record<string, { value?: unknown }>, fid: number): unknown {
  return record[String(fid)]?.value;
}

export async function fetchQuickbaseItems(
  config: ConnectionConfig['quickbase']
): Promise<{ items: QuickbaseItemRow[]; apiCalls: number }> {
  const hostname = config.realmHostname.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const select = [
    config.skuFieldId,
    config.qtyFieldId,
    config.productFamilyFieldId,
    config.itemNameFieldId,
    config.recordIdFieldId,
    config.activeFieldId,
  ].filter((id): id is number => typeof id === 'number' && id > 0);

  const items: QuickbaseItemRow[] = [];
  let skip = 0;
  const pageSize = 1000;
  let apiCalls = 0;

  while (true) {
    const body = {
      from: config.tableId,
      select,
      options: { skip, top: pageSize },
    };

    const res = await fetch(`https://api.quickbase.com/v1/records/query`, {
      method: 'POST',
      headers: {
        'QB-USER-TOKEN': config.userToken,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    apiCalls += 1;

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`QuickBase API error (${res.status}): ${text}`);
    }

    const data = (await res.json()) as {
      data?: Record<string, { value?: unknown }>[];
      metadata?: { numRecords?: number; totalRecords?: number };
    };

    const records = data.data ?? [];
    for (const rec of records) {
      const sku = String(fieldValue(rec, config.skuFieldId) ?? '').trim();
      const productFamily = String(
        fieldValue(rec, config.productFamilyFieldId) ?? ''
      ).trim();

      if (
        EXCLUDED_PRODUCT_FAMILIES.includes(
          productFamily as (typeof EXCLUDED_PRODUCT_FAMILIES)[number]
        )
      ) {
        continue;
      }

      if (!sku) continue;

      items.push({
        sku: sku.toUpperCase(),
        qty: parseQty(fieldValue(rec, config.qtyFieldId)),
        productFamily,
        itemName: config.itemNameFieldId
          ? String(fieldValue(rec, config.itemNameFieldId) ?? '').trim()
          : '',
        recordId: config.recordIdFieldId
          ? String(fieldValue(rec, config.recordIdFieldId) ?? '').trim()
          : '',
        active: config.activeFieldId
          ? String(fieldValue(rec, config.activeFieldId) ?? '').trim()
          : '',
      });
    }

    if (records.length < pageSize) break;
    skip += pageSize;
  }

  return { items, apiCalls };
}

export async function testQuickbaseConnection(
  config: ConnectionConfig['quickbase']
): Promise<{ ok: boolean; message: string; recordCount?: number }> {
  try {
    const { items, apiCalls } = await fetchQuickbaseItems(config);
    return {
      ok: true,
      message: `Connected. Fetched ${items.length} comparable items (${apiCalls} API call${apiCalls > 1 ? 's' : ''}).`,
      recordCount: items.length,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
