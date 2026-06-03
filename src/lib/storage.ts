import type { ConnectionConfig } from './types';

const STORAGE_KEY = 'qb-hs-qty-compare-config';

export const DEFAULT_CONFIG: ConnectionConfig = {
  quickbase: {
    realmHostname: 'isee.quickbase.com',
    userToken: '',
    tableId: 'bkma4n8tr',
    skuFieldId: 6,
    qtyFieldId: 0,
    productFamilyFieldId: 8,
    itemNameFieldId: 0,
    recordIdFieldId: 3,
    activeFieldId: 0,
  },
  hubspot: {
    accessToken: '',
    objectType: 'products',
    skuProperty: 'hs_sku',
    qtyProperty: 'qty_available',
    productFamilyProperty: 'product_family',
    nameProperty: 'name',
  },
};

/** @deprecated Use Firebase via useAuth(). Settings are stored in Firestore. */
export function loadConfig(): ConnectionConfig {
  return DEFAULT_CONFIG;
}

/** @deprecated Use useAuth().saveConfig() */
export function saveConfig(_config: ConnectionConfig): void {
  // no-op: persisted in Firestore when signed in
}

export function maskToken(token: string): string {
  if (!token || token.length < 8) return token ? '••••••••' : '';
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}
