import { NextRequest, NextResponse } from 'next/server';
import { runCompare, getConfigFromEnv } from '@/lib/compare';
import type { ConnectionConfig } from '@/lib/types';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { config?: ConnectionConfig };
    const config = body.config ?? getConfigFromEnv();

    if (!config) {
      return NextResponse.json(
        {
          error:
            'No configuration. Add API keys in Settings or set environment variables on Vercel.',
        },
        { status: 400 }
      );
    }

    if (!config.quickbase.userToken || !config.hubspot.accessToken) {
      return NextResponse.json(
        { error: 'QuickBase user token and HubSpot access token are required.' },
        { status: 400 }
      );
    }

    if (!config.quickbase.qtyFieldId || !config.quickbase.skuFieldId) {
      return NextResponse.json(
        { error: 'QuickBase SKU and Quantity field IDs are required.' },
        { status: 400 }
      );
    }

    const result = await runCompare(config);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
