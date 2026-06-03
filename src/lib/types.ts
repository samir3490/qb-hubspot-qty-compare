export const EXCLUDED_PRODUCT_FAMILIES = [
  'PumpLoc',
  'Home&Foundry',
  'Literature',
  'Popfin',
  'Cooler',
  'Signage',
  'Samples',
  'Edge',
  'DO NOT USE',
] as const;

export interface ConnectionConfig {
  quickbase: {
    realmHostname: string;
    userToken: string;
    tableId: string;
    skuFieldId: number;
    qtyFieldId: number;
    productFamilyFieldId: number;
    activeFieldId?: number;
    itemNameFieldId?: number;
    recordIdFieldId?: number;
  };
  hubspot: {
    accessToken: string;
    objectType: string;
    skuProperty: string;
    qtyProperty: string;
    productFamilyProperty: string;
    nameProperty: string;
  };
  /** App behavior preferences (stored with connection config) */
  preferences?: {
    /** Daily cron: after compare, push QB qty to HubSpot for mismatches */
    autoSyncHubSpotOnDaily?: boolean;
  };
}

export type CompareStatus =
  | 'match'
  | 'mismatch'
  | 'qb_only'
  | 'hs_only'
  | 'excluded';

export interface CompareRow {
  status: CompareStatus;
  sku: string;
  productFamily: string;
  itemName: string;
  qbQty: number | null;
  hsQty: number | null;
  difference: number | null;
  absDifference: number | null;
  qbRecordId: string;
  hsRecordId: string;
  hsName: string;
  notes: string;
}

export interface CompareSummary {
  runAt: string;
  qbTotal: number;
  qbExcluded: number;
  qbCompared: number;
  hsTotal: number;
  matched: number;
  matches: number;
  mismatches: number;
  qbOnly: number;
  hsOnly: number;
  apiCallsEstimate: { quickbase: number; hubspot: number };
}

export interface CompareResult {
  summary: CompareSummary;
  rows: CompareRow[];
  excluded: Array<{ sku: string; productFamily: string; qbQty: number | null }>;
}
