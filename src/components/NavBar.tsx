'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function NavBar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  if (pathname === '/login') return null;

  return (
    <nav>
      <Link href="/" className="brand">
        QB ↔ HubSpot Qty
      </Link>
      <Link href="/" className={pathname === '/' ? 'active' : ''}>
        Compare
      </Link>
      <Link
        href="/history"
        className={pathname === '/history' ? 'active' : ''}
      >
        History
      </Link>
      <Link
        href="/settings"
        className={pathname === '/settings' ? 'active' : ''}
      >
        Settings
      </Link>
      <span style={{ flex: 1 }} />
      {user && (
        <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
          {user.email}
        </span>
      )}
      {user && (
        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '0.35rem 0.75rem', marginLeft: '0.75rem' }}
          onClick={() => signOut()}
        >
          Sign out
        </button>
      )}
    </nav>
  );
}
