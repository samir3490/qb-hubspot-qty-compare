/** HubSpot Private App scopes required for this app (read-only compare). */
export const HUBSPOT_REQUIRED_SCOPES = [
  {
    scope: 'crm.objects.products.read',
    why: 'List and read product records (SKU, quantity, etc.)',
  },
  {
    scope: 'crm.schemas.products.read',
    why: 'Read custom product property values (qty_available, product_family, etc.)',
  },
] as const;

export const HUBSPOT_OPTIONAL_SCOPES = [
  {
    scope: 'crm.objects.custom.read',
    why: 'Only if products live in a custom object instead of Products',
  },
  {
    scope: 'crm.schemas.custom.read',
    why: 'Custom object property definitions',
  },
] as const;

export function parseHubspotApiError(status: number, body: string): string {
  let detail = body;
  try {
    const json = JSON.parse(body) as {
      message?: string;
      category?: string;
      errors?: Array<{ message?: string; context?: { requiredGranularity?: string } }>;
    };
    detail = json.message ?? body;
    if (json.category === 'MISSING_SCOPES' || /scope|permission/i.test(body)) {
      detail += ` — Required Private App scopes: ${HUBSPOT_REQUIRED_SCOPES.map((s) => s.scope).join(', ')}. Update in HubSpot → Settings → Integrations → Private Apps → your app → Scopes, then regenerate the token.`;
    }
  } catch {
    if (/insufficient|permission|scope|403|401/i.test(body)) {
      detail += ` — Check HubSpot Private App scopes: ${HUBSPOT_REQUIRED_SCOPES.map((s) => s.scope).join(', ')}.`;
    }
  }
  if (status === 403 || status === 401) {
    return `HubSpot API error (${status}): ${detail}`;
  }
  return `HubSpot API error (${status}): ${detail}`;
}
