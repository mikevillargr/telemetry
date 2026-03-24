'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './auth-context';
import { apiFetch } from './api';

interface ClientInfo {
  id: string;
  name: string;
  industry: string;
}

interface ClientContextType {
  clients: ClientInfo[];
  selectedClient: ClientInfo | null;
  setSelectedClient: (client: ClientInfo | null) => void;
  loading: boolean;
}

const ClientContext = createContext<ClientContextType | null>(null);

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!user) {
      setClients([]);
      setSelectedClient(null);
      setLoading(false);
      hasInitialized.current = false;
      return;
    }

    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const fetchClients = async () => {
      try {
        const data = await apiFetch<ClientInfo[]>('/api/clients');
        setClients(data);
        if (data.length > 0) {
          setSelectedClient(data[0]);
        }
      } catch (err) {
        console.error('Failed to fetch clients:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [user]);

  return (
    <ClientContext.Provider value={{ clients, selectedClient, setSelectedClient, loading }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return context;
}
