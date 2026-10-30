import { NextResponse } from 'next/server';

/** Retired. Quantity compare is no longer available. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        'Quantity compare is retired. Daily cron, compare, and mismatch emails are off.',
    },
    { status: 410 }
  );
}
