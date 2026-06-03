import { NextRequest, NextResponse } from 'next/server';
import { testHubspotConnection } from '@/lib/hubspot';
import type { ConnectionConfig } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { config } = (await request.json()) as {
      config: ConnectionConfig['hubspot'];
    };
    const result = await testHubspotConnection(config);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
