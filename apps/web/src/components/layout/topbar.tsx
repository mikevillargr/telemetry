'use client';

import { useState } from 'react';
import { ChevronDown, Calendar, Sparkles } from 'lucide-react';
import { useClient } from '@/lib/client-context';
import { cn } from '@/lib/utils';

export function Topbar() {
  const { clients, selectedClient, setSelectedClient } = useClient();
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [dateRange, setDateRange] = useState('Last 30 days');

  return (
    <header className="h-16 border-b border-border px-6 flex items-center justify-between bg-background shrink-0">
      {/* Left: Client selector */}
      <div className="relative">
        <button
          onClick={() => setClientDropdownOpen(!clientDropdownOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors"
        >
          {selectedClient && (
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              {selectedClient.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="text-sm font-medium text-foreground">
            {selectedClient?.name || 'Select client'}
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>

        {clientDropdownOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setClientDropdownOpen(false)} />
            <div className="absolute top-full left-0 mt-1 w-64 bg-popover border border-border rounded-md shadow-lg z-40 py-1 max-h-64 overflow-y-auto">
              {clients.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No clients</div>
              ) : (
                clients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => {
                      setSelectedClient(client);
                      setClientDropdownOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2',
                      selectedClient?.id === client.id && 'bg-accent'
                    )}
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                      {client.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span>{client.name}</span>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Right: Actions + Date picker */}
      <div className="flex items-center gap-3">
        <button className="inline-flex items-center gap-2 h-9 px-4 rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors">
          <Sparkles className="w-4 h-4" />
          Sulu
        </button>

        <div className="h-6 w-px bg-border" />

        <button className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm font-medium border border-border bg-transparent hover:bg-accent transition-colors text-foreground">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          {dateRange}
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
