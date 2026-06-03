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

export function loadConfig(): ConnectionConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: ConnectionConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function maskToken(token: string): string {
  if (!token || token.length < 8) return token ? '••••••••' : '';
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}
