'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { ClientProvider } from '@/lib/client-context';
import { Sidebar } from '@/components/layout/sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <ClientProvider>
        <div className="flex min-h-screen bg-background text-foreground relative overflow-hidden">
          <Sidebar />
          <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
            {children}
          </main>
        </div>
      </ClientProvider>
    </ProtectedRoute>
  );
}
