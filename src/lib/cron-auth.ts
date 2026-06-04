import type { NextRequest } from 'next/server';

export function getCronSecret(): string | undefined {
  const secret = process.env.CRON_SECRET?.trim();
  return secret || undefined;
}

/** True when Vercel Cron invokes this route (includes x-vercel-cron-schedule). */
export function isVercelCronRequest(request: NextRequest): boolean {
  return (
    request.headers.get('x-vercel-cron-schedule') != null ||
    request.headers.get('user-agent')?.includes('vercel-cron') === true
  );
}

export function isCronAuthorized(request: NextRequest): boolean {
  const secret = getCronSecret();
  if (!secret) return false;

  const auth = request.headers.get('authorization')?.trim();
  if (auth === `Bearer ${secret}`) return true;

  // Some callers omit "Bearer " — accept raw secret as fallback.
  if (auth === secret) return true;

  return false;
}
