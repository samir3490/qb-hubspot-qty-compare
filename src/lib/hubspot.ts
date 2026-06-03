import type { ConnectionConfig } from './types';

export interface HubspotProductRow {
  sku: string;
  qty: number | null;
  productFamily: string;
  name: string;
  recordId: string;
  quickbaseRecordId: string;
}

function parseQty(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const s = String(value).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function fetchHubspotProducts(
  config: ConnectionConfig['hubspot']
): Promise<{ products: HubspotProductRow[]; apiCalls: number }> {
  const properties = [
    config.skuProperty,
    config.qtyProperty,
    config.productFamilyProperty,
    config.nameProperty,
    'quickbase_record_id',
  ].join(',');

  const products: HubspotProductRow[] = [];
  let after: string | undefined;
  let apiCalls = 0;

  while (true) {
    const url = new URL(
      `https://api.hubapi.com/crm/v3/objects/${config.objectType}`
    );
    url.searchParams.set('limit', '100');
    url.searchParams.set('properties', properties);
    if (after) url.searchParams.set('after', after);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        Accept: 'application/json',
      },
    });

    apiCalls += 1;

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HubSpot API error (${res.status}): ${text}`);
    }

    const data = (await res.json()) as {
      results?: Array<{
        id: string;
        properties: Record<string, string | null>;
      }>;
      paging?: { next?: { after?: string } };
    };

    for (const row of data.results ?? []) {
      const props = row.properties ?? {};
      const sku = String(props[config.skuProperty] ?? '').trim();
      if (!sku) continue;

      products.push({
        sku: sku.toUpperCase(),
        qty: parseQty(props[config.qtyProperty]),
        productFamily: String(props[config.productFamilyProperty] ?? '').trim(),
        name: String(props[config.nameProperty] ?? '').trim(),
        recordId: row.id,
        quickbaseRecordId: String(props.quickbase_record_id ?? '').trim(),
      });
    }

    after = data.paging?.next?.after;
    if (!after) break;
  }

  return { products, apiCalls };
}

export async function testHubspotConnection(
  config: ConnectionConfig['hubspot']
): Promise<{ ok: boolean; message: string; recordCount?: number }> {
  try {
    const { products, apiCalls } = await fetchHubspotProducts(config);
    return {
      ok: true,
      message: `Connected. Fetched ${products.length} products (${apiCalls} API call${apiCalls > 1 ? 's' : ''}).`,
      recordCount: products.length,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
