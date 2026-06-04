'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { IseeLogo } from '@/components/IseeLogo';

export function NavBar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  if (pathname === '/login') return null;

  return (
    <nav className="app-nav">
      <div className="nav-brand-group">
        <Link href="/" className="nav-logo-link" aria-label="iSee Store Innovations home">
          <IseeLogo className="nav-logo-isee" />
        </Link>
        <span className="nav-divider" aria-hidden />
        <span className="nav-app-title">Qty Compare</span>
      </div>

      <div className="nav-links">
        <Link href="/" className={pathname === '/' ? 'active' : ''}>
          Compare
        </Link>
        <Link href="/history" className={pathname === '/history' ? 'active' : ''}>
          History
        </Link>
        <Link href="/settings" className={pathname === '/settings' ? 'active' : ''}>
          Settings
        </Link>
      </div>

      <span className="nav-spacer" />

      {user && <span className="nav-user">{user.email}</span>}
      {user && (
        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '0.35rem 0.75rem' }}
          onClick={() => signOut()}
        >
          Sign out
        </button>
      )}

      <div className="nav-powered">
        <span className="nav-powered-label">
          Built by
          <br />
          Agrasen
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logos/agrasen-logo.png"
          alt="Agrasen Technologies"
          className="nav-logo-agrasen"
        />
      </div>
    </nav>
  );
}
