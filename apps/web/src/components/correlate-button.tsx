'use client';

import { useState } from 'react';
import { Link2, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';

interface CorrelateButtonProps {
  clientId: string;
  content: string;
  contentType?: string;
  metadata?: Record<string, unknown>;
  label?: string;
  size?: 'sm' | 'default';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
  trendId?: string;
  onCorrelated?: (documentId: string) => void;
}

export function CorrelateButton({
  clientId,
  content,
  contentType = 'strategy',
  metadata = {},
  label = 'Correlate to RAG',
  size = 'sm',
  variant = 'outline',
  className = '',
  trendId,
  onCorrelated,
}: CorrelateButtonProps) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [documentId, setDocumentId] = useState<string | null>(null);

  const handleCorrelate = async () => {
    if (status === 'saving' || status === 'saved') return;
    setStatus('saving');
    try {
      // Step 1: Save to RAG
      const ragResponse = await apiFetch<{ stored: number; documentId?: string }>(`/api/rag/${clientId}/ingest`, {
        method: 'POST',
        body: {
          content,
          contentType,
          metadata,
          authorAgent: 'strategy',
        },
      });

      // Step 2: Auto-correlate with data if trendId is provided
      if (trendId) {
        try {
          await apiFetch(`/api/trends/${trendId}/analyze`, {
            method: 'POST',
            body: { clientId },
          });
        } catch (analyzeError) {
          console.error('Auto-correlation failed:', analyzeError);
          // Don't fail the whole operation if analysis fails
        }
      }

      setStatus('saved');
      const docId = ragResponse.documentId || `doc-${Date.now()}`;
      setDocumentId(docId);
      onCorrelated?.(docId);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const handleUncorrelate = async () => {
    if (!documentId) return;
    try {
      await apiFetch(`/api/rag/${clientId}/documents/${documentId}`, {
        method: 'DELETE',
      });
      setStatus('idle');
      setDocumentId(null);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={status === 'saved' ? 'default' : variant}
        size={size}
        className={`gap-1.5 ${status === 'saved' ? 'bg-emerald-600 hover:bg-emerald-600 text-white' : ''} ${className}`}
        onClick={handleCorrelate}
        disabled={status === 'saving'}
      >
        {status === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {status === 'saved' && <Check className="w-3.5 h-3.5" />}
        {(status === 'idle' || status === 'error') && <Link2 className="w-3.5 h-3.5" />}
        {status === 'saving' ? 'Correlating...' : status === 'saved' ? 'Correlated' : status === 'error' ? 'Failed — Retry' : label}
      </Button>
      {status === 'saved' && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-destructive"
          onClick={handleUncorrelate}
        >
          Uncorrelate
        </Button>
      )}
    </div>
  );
}
