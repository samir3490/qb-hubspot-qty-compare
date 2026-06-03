'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { NavBar } from '@/components/NavBar';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <NavBar />
        {children}
      </AuthGuard>
    </AuthProvider>
  );
}
