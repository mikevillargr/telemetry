'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { ClientProvider } from '@/lib/client-context';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <ClientProvider>
        <div className="min-h-screen bg-background text-foreground">
          {children}
        </div>
      </ClientProvider>
    </ProtectedRoute>
  );
}
