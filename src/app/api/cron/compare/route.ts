import { NextRequest, NextResponse } from 'next/server';
import { runCompare, getConfigFromEnv } from '@/lib/compare';

export const maxDuration = 60;

/** Daily compare via Vercel Cron — requires CRON_SECRET and env config */
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = getConfigFromEnv();
  if (!config) {
    return NextResponse.json(
      { error: 'Server env not configured for cron compare.' },
      { status: 500 }
    );
  }

  try {
    const result = await runCompare(config);
    return NextResponse.json({
      ok: true,
      summary: result.summary,
      mismatchCount: result.summary.mismatches,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
