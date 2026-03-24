'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Users, Plus, MoreHorizontal, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api';

interface ClientRow {
  id: string;
  name: string;
  industry: string;
  domains: string[];
  createdAt: string;
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<ClientRow[]>('/api/clients')
      .then(setClients)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  const handleClientClick = (id: string) => {
    router.push(`/clients/${id}`);
  };
  return (
    <div className="p-8 h-full overflow-y-auto max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground mt-1">
            Manage client configurations, goals, and data sources.
          </p>
        </div>
        <Button className="gap-2 rounded-full shadow-sm px-5">
          <Plus className="w-4 h-4" />
          Add Client
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="hidden sm:flex items-center justify-between px-6 py-3 bg-accent/30 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <div className="w-[40%]">Client</div>
          <div className="w-[30%]">Team & Sources</div>
          <div className="w-[20%] text-right">Status</div>
          <div className="w-[10%] text-right">Actions</div>
        </div>

        <div className="divide-y divide-border/50">
          {loading ? (
            <div className="p-12 flex items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading clients...
            </div>
          ) : clients.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No clients yet. Create one to get started.
            </div>
          ) : (
            clients.map((client) => (
              <div
                key={client.id}
                onClick={() => handleClientClick(client.id)}
                className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-accent/20 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-4 w-full sm:w-[40%]">
                  <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400 font-bold text-sm flex-shrink-0 shadow-sm">
                    {client.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm text-foreground">
                        {client.name}
                      </h3>
                      {client.industry && (
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5 px-1.5 font-normal shadow-none border-border/60 bg-background"
                        >
                          {client.industry}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1 w-full sm:w-[30%]">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {client.domains?.length > 0 ? client.domains[0] : 'No domain'}
                  </span>
                </div>

                <div className="w-full sm:w-[20%] text-left sm:text-right">
                  <div className="text-sm font-medium text-foreground">
                    Active
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Created {new Date(client.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-[10%] justify-start sm:justify-end opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClientClick(client.id);
                    }}
                    className="gap-1.5 rounded-full border-border/60 shadow-sm bg-background hover:bg-accent"
                  >
                    Manage
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => e.stopPropagation()}
                    className="h-8 w-8 text-muted-foreground rounded-full hover:bg-accent"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
