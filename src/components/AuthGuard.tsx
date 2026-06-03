'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const PUBLIC_PATHS = ['/login'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
    if (!user && !isPublic) {
      router.replace('/login');
    }
    if (user && pathname === '/login') {
      router.replace('/');
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="container loading">Loading…</div>
    );
  }

  if (!user && !PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return <div className="container loading">Redirecting to sign in…</div>;
  }

  return <>{children}</>;
}
