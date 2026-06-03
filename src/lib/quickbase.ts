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

function normalizeRealmHostname(raw: string): string {
  const host = raw
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\/$/, '');
  if (!host) {
    throw new Error(
      'QuickBase realm hostname is required (e.g. yourcompany.quickbase.com).'
    );
  }
  if (host === 'api.quickbase.com' || host.includes('quickbase.com/db')) {
    throw new Error(
      'Use your realm hostname (e.g. isee.quickbase.com), not api.quickbase.com or an app URL.'
    );
  }
  return host;
}

function formatQuickbaseAuthorization(rawToken: string): string {
  const token = rawToken.trim();
  if (!token) {
    throw new Error('QuickBase user token is required.');
  }
  if (/^QB-USER-TOKEN\s+/i.test(token)) {
    return token;
  }
  if (/^QB-TEMP-TOKEN\s+/i.test(token)) {
    return token;
  }
  return `QB-USER-TOKEN ${token}`;
}

export function quickbaseHeaders(
  config: ConnectionConfig['quickbase']
): Record<string, string> {
  return {
    Authorization: formatQuickbaseAuthorization(config.userToken),
    'QB-Realm-Hostname': normalizeRealmHostname(config.realmHostname),
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': 'qb-hubspot-qty-compare/1.0',
  };
}

export async function fetchQuickbaseItems(
  config: ConnectionConfig['quickbase']
): Promise<{ items: QuickbaseItemRow[]; apiCalls: number }> {
  normalizeRealmHostname(config.realmHostname);
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
      headers: quickbaseHeaders(config),
      body: JSON.stringify(body),
    });

    apiCalls += 1;

    if (!res.ok) {
      const text = await res.text();
      let hint = '';
      if (res.status === 403 || res.status === 401) {
        hint =
          ' Check: realm hostname (e.g. isee.quickbase.com), valid user token, and access to the Items table.';
      }
      if (res.status === 400 && text.includes('authorization')) {
        hint = ' Authorization header must be QB-USER-TOKEN followed by your token.';
      }
      throw new Error(`QuickBase API error (${res.status}): ${text}${hint}`);
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
