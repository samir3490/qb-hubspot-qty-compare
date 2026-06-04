'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { NavBar } from '@/components/NavBar';
import { AppFooter } from '@/components/AppFooter';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <NavBar />
        {children}
        <AppFooter />
      </AuthGuard>
    </AuthProvider>
  );
}
