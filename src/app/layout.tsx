import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'QB ↔ HubSpot Quantity Compare',
  description:
    'Compare QuickBase and HubSpot product quantities with minimal API usage',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav>
          <Link href="/" className="brand">
            QB ↔ HubSpot Qty
          </Link>
          <Link href="/">Compare</Link>
          <Link href="/settings">Settings</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
