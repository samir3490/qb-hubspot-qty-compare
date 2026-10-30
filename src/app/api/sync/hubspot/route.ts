import { NextResponse } from 'next/server';

/** Retired. HubSpot quantity sync from this app is no longer available. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        'HubSpot quantity sync is retired. This compare application is no longer in use.',
    },
    { status: 410 }
  );
}
