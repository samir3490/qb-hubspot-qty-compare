import { NextRequest, NextResponse } from 'next/server';
import { testQuickbaseConnection } from '@/lib/quickbase';
import type { ConnectionConfig } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { config } = (await request.json()) as {
      config: ConnectionConfig['quickbase'];
    };
    const result = await testQuickbaseConnection(config);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
