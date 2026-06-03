import type { CompareResult, CompareRow, ConnectionConfig } from './types';
import { EXCLUDED_PRODUCT_FAMILIES } from './types';
import { fetchHubspotProducts } from './hubspot';
import { fetchQuickbaseItems } from './quickbase';

const QTY_EPS = 0.0001;

export async function runCompare(
  config: ConnectionConfig
): Promise<CompareResult> {
  const [qbResult, hsResult] = await Promise.all([
    fetchQuickbaseItems(config.quickbase),
    fetchHubspotProducts(config.hubspot),
  ]);

  const hsBySku = new Map(
    hsResult.products.map((p) => [p.sku, p] as const)
  );
  const qbBySku = new Map(qbResult.items.map((i) => [i.sku, i] as const));

  const rows: CompareRow[] = [];
  const excluded: CompareResult['excluded'] = [];
  let qbExcluded = 0;

  // Count excluded would need separate pass - we filter in fetch; estimate from total if needed
  // For excluded list we'd need unfiltered fetch - skip for API efficiency; document in UI

  const matchedSkus = new Set<string>();

  for (const qb of qbResult.items) {
    const hs = hsBySku.get(qb.sku);
    if (!hs) {
      rows.push({
        status: 'qb_only',
        sku: qb.sku,
        productFamily: qb.productFamily,
        itemName: qb.itemName,
        qbQty: qb.qty,
        hsQty: null,
        difference: null,
        absDifference: null,
        qbRecordId: qb.recordId,
        hsRecordId: '',
        hsName: '',
        notes: 'SKU in QuickBase but not found in HubSpot',
      });
      continue;
    }

    matchedSkus.add(qb.sku);
    const diff =
      qb.qty !== null && hs.qty !== null ? hs.qty - qb.qty : null;
    const absDiff = diff !== null ? Math.abs(diff) : null;
    const match =
      qb.qty !== null &&
      hs.qty !== null &&
      Math.abs(qb.qty - hs.qty) < QTY_EPS;

    rows.push({
      status: match ? 'match' : 'mismatch',
      sku: qb.sku,
      productFamily: qb.productFamily,
      itemName: qb.itemName,
      qbQty: qb.qty,
      hsQty: hs.qty,
      difference: diff,
      absDifference: absDiff,
      qbRecordId: qb.recordId,
      hsRecordId: hs.recordId,
      hsName: hs.name,
      notes: match
        ? ''
        : `HubSpot (${hs.qty}) ≠ QuickBase (${qb.qty})`,
    });
  }

  for (const [sku, hs] of hsBySku) {
    if (matchedSkus.has(sku)) continue;
    rows.push({
      status: 'hs_only',
      sku,
      productFamily: hs.productFamily,
      itemName: '',
      qbQty: null,
      hsQty: hs.qty,
      difference: null,
      absDifference: null,
      qbRecordId: hs.quickbaseRecordId,
      hsRecordId: hs.recordId,
      hsName: hs.name,
      notes: 'SKU in HubSpot but not in filtered QuickBase export',
    });
  }

  const mismatches = rows.filter((r) => r.status === 'mismatch');
  const matches = rows.filter((r) => r.status === 'match');
  const qbOnly = rows.filter((r) => r.status === 'qb_only');
  const hsOnly = rows.filter((r) => r.status === 'hs_only');

  mismatches.sort(
    (a, b) => (b.absDifference ?? 0) - (a.absDifference ?? 0)
  );

  return {
    summary: {
      runAt: new Date().toISOString(),
      qbTotal: qbResult.items.length + qbExcluded,
      qbExcluded,
      qbCompared: qbResult.items.length,
      hsTotal: hsResult.products.length,
      matched: matchedSkus.size,
      matches: matches.length,
      mismatches: mismatches.length,
      qbOnly: qbOnly.length,
      hsOnly: hsOnly.length,
      apiCallsEstimate: {
        quickbase: qbResult.apiCalls,
        hubspot: hsResult.apiCalls,
      },
    },
    rows: [
      ...mismatches,
      ...qbOnly,
      ...hsOnly,
      ...matches,
    ],
    excluded,
  };
}

export function getConfigFromEnv(): ConnectionConfig | null {
  const qbToken = process.env.QB_USER_TOKEN;
  const qbTable = process.env.QB_TABLE_ID;
  const hsToken = process.env.HUBSPOT_ACCESS_TOKEN;

  if (!qbToken || !qbTable || !hsToken) return null;

  return {
    quickbase: {
      realmHostname: process.env.QB_REALM_HOSTNAME ?? '',
      userToken: qbToken,
      tableId: qbTable,
      skuFieldId: Number(process.env.QB_FIELD_SKU ?? 0),
      qtyFieldId: Number(process.env.QB_FIELD_QTY ?? 0),
      productFamilyFieldId: Number(process.env.QB_FIELD_PRODUCT_FAMILY ?? 0),
      itemNameFieldId: Number(process.env.QB_FIELD_ITEM_NAME ?? 0) || undefined,
      recordIdFieldId: Number(process.env.QB_FIELD_RECORD_ID ?? 0) || undefined,
      activeFieldId: Number(process.env.QB_FIELD_ACTIVE ?? 0) || undefined,
    },
    hubspot: {
      accessToken: hsToken,
      objectType: process.env.HUBSPOT_OBJECT_TYPE ?? 'products',
      skuProperty: process.env.HS_PROP_SKU ?? 'hs_sku',
      qtyProperty: process.env.HS_PROP_QTY ?? 'qty_available',
      productFamilyProperty:
        process.env.HS_PROP_PRODUCT_FAMILY ?? 'product_family',
      nameProperty: process.env.HS_PROP_NAME ?? 'name',
    },
  };
}

export { EXCLUDED_PRODUCT_FAMILIES };
