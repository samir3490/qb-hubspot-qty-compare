'use client';

import { usePathname } from 'next/navigation';

export function AppFooter() {
  const pathname = usePathname();
  if (pathname === '/login') return null;

  return (
    <footer className="app-footer">
      <span className="app-footer-copy">
        © {new Date().getFullYear()} iSee Store Innovations · QuickBase ↔ HubSpot
        quantity reconciliation
      </span>
      <div className="app-footer-brand">
        <span className="nav-powered-label">Powered by</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logos/agrasen-logo.svg"
          alt="Agrasen Technologies IT Consulting Services"
        />
      </div>
    </footer>
  );
}
