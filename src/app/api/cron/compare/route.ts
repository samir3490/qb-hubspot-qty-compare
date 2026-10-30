import { NextResponse } from 'next/server';

/**
 * Retired. Daily quantity compare is no longer scheduled or executed.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      disabled: true,
      message: 'Daily quantity compare is retired. Cron and emails are off.',
    },
    { status: 410 }
  );
}
