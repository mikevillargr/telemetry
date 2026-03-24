'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  RefreshCw,
  Search,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { CorrelateButton } from '@/components/correlate-button';
import { useClient } from '@/lib/client-context';
import { apiFetch } from '@/lib/api';
import { SuluMarkdown } from '@/components/sulu/sulu-markdown';

type TrendCategory = 'seo' | 'geo_ai_visibility' | 'paid_media' | 'research';

interface TrendItem {
  id: string;
  url: string;
  title: string;
  summary: string;
  category: TrendCategory;
  source: string;
  publishedAt: string | null;
  createdAt: string;
}

interface DigestSchedule {
  id: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  hour: number;
  timezone: string;
  enabled: boolean;
  lastRunAt: string | null;
}

const CATEGORY_META: Record<TrendCategory | 'all', { label: string; catColor: string; sourceColor: string }> = {
  all: { label: 'All', catColor: '', sourceColor: '' },
  seo: { label: 'SEO', catColor: 'bg-blue-50 text-blue-600 border-blue-200', sourceColor: 'bg-blue-100 text-blue-600' },
  geo_ai_visibility: { label: 'GEO/AI Visibility', catColor: 'bg-purple-50 text-purple-600 border-purple-200', sourceColor: 'bg-purple-100 text-purple-600' },
  paid_media: { label: 'Paid Media', catColor: 'bg-emerald-50 text-emerald-600 border-emerald-200', sourceColor: 'bg-emerald-100 text-emerald-600' },
  research: { label: 'Research', catColor: 'bg-amber-50 text-amber-600 border-amber-200', sourceColor: 'bg-amber-100 text-amber-600' },
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export default function TrendsPage() {
  const { clients, selectedClient } = useClient();
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const PAGE_SIZE = 24;
  const [ingesting, setIngesting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<TrendCategory | 'all'>('all');
  const [modalTrend, setModalTrend] = useState<TrendItem | null>(null);
  const [analysisClientId, setAnalysisClientId] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [schedule, setSchedule] = useState<DigestSchedule | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const params = activeFilter !== 'all' ? `?category=${activeFilter}&limit=${PAGE_SIZE}` : `?limit=${PAGE_SIZE}`;
      const data = await apiFetch<{ items: TrendItem[]; total: number }>(`/api/trends${params}`);
      setTrends(data.items);
      setTotal(data.total);
    } catch { /* empty */ }
    setLoading(false);
  };

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const catParam = activeFilter !== 'all' ? `&category=${activeFilter}` : '';
      const data = await apiFetch<{ items: TrendItem[]; total: number }>(
        `/api/trends?limit=${PAGE_SIZE}&offset=${trends.length}${catParam}`
      );
      setTrends((prev) => [...prev, ...(data.items || [])]);
      setTotal(data.total);
    } catch { /* empty */ }
    loadingMoreRef.current = false;
    setLoadingMore(false);
  }, [activeFilter, trends.length]);

  // IntersectionObserver for infinite scroll
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMore = !loading && trends.length < total;

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  useEffect(() => { 
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = activeFilter !== 'all' ? `?category=${activeFilter}&limit=${PAGE_SIZE}` : `?limit=${PAGE_SIZE}`;
        const data = await apiFetch<{ items: TrendItem[]; total: number }>(`/api/trends${params}`);
        setTrends(data.items);
        setTotal(data.total);
      } catch { /* empty */ }
      setLoading(false);
    };

    const fetchSched = async () => {
      try {
        const data = await apiFetch<DigestSchedule>('/api/trends/schedule');
        setSchedule(data);
      } catch { /* empty */ }
    };

    fetchData();
    fetchSched();
  }, [activeFilter]);
  useEffect(() => {
    if (selectedClient) setAnalysisClientId(selectedClient.id);
  }, [selectedClient]);

  const handleIngest = async () => {
    setIngesting(true);
    try {
      await apiFetch<{ newItems: number }>('/api/trends/ingest', { method: 'POST', body: {} });
      await fetchTrends();
    } catch { /* empty */ }
    setIngesting(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      await apiFetch('/api/trends/search', {
        method: 'POST',
        body: { query: searchQuery.trim(), category: activeFilter !== 'all' ? activeFilter : 'research' },
      });
      await fetchTrends();
      setSearchQuery('');
    } catch { /* empty */ }
    setSearching(false);
  };

  const handleAnalyze = async (trendId: string) => {
    if (!analysisClientId) return;
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const data = await apiFetch<{ analysis: string }>(`/api/trends/${trendId}/analyze`, {
        method: 'POST',
        body: { clientId: analysisClientId },
      });
      setAnalysisResult(data.analysis);
    } catch {
      setAnalysisResult('Failed to generate impact analysis.');
    }
    setAnalyzing(false);
  };

  const handleScheduleChange = async (frequency: 'daily' | 'weekly' | 'monthly') => {
    setSavingSchedule(true);
    try {
      const data = await apiFetch<DigestSchedule>('/api/trends/schedule', {
        method: 'PATCH',
        body: { frequency },
      });
      setSchedule(data);
    } catch { /* empty */ }
    setSavingSchedule(false);
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Intelligence Feed
            </h1>
            <p className="text-muted-foreground mt-1">
              Actionable industry trends, algorithm updates, and platform changes.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-full shadow-sm"
            onClick={handleIngest}
            disabled={ingesting}
          >
            <RefreshCw className={`w-4 h-4 ${ingesting ? 'animate-spin' : ''}`} />
            {ingesting ? 'Fetching...' : 'Refresh Feeds'}
          </Button>
        </div>

        {/* Search bar */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search for trend signals (powered by Brave Search)..."
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button
            size="sm"
            className="gap-2 shadow-sm h-10 px-4"
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </Button>
        </div>

        {/* Category filter pills */}
        <div className="flex gap-2 mb-8 pb-4 border-b border-border overflow-x-auto">
          {(['all', 'seo', 'geo_ai_visibility', 'paid_media', 'research'] as const).map((cat) => (
            <Badge
              key={cat}
              variant={activeFilter === cat ? 'default' : 'outline'}
              className={`cursor-pointer ${activeFilter === cat ? 'shadow-sm' : 'hover:bg-accent bg-card'}`}
              onClick={() => setActiveFilter(cat)}
            >
              {CATEGORY_META[cat].label}
            </Badge>
          ))}
          <span className="ml-auto text-xs text-muted-foreground self-center">
            {total} items
          </span>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading trends...
          </div>
        )}

        {/* Empty state */}
        {!loading && trends.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">No trends found. Click "Refresh Feeds" to ingest RSS sources.</p>
            <Button onClick={handleIngest} disabled={ingesting} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${ingesting ? 'animate-spin' : ''}`} />
              Fetch Latest Trends
            </Button>
          </div>
        )}

        {/* Trend cards — grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {trends.map((trend) => {
            const meta = CATEGORY_META[trend.category] || CATEGORY_META.research;
            const sourceInitial = trend.source?.charAt(0)?.toUpperCase() || '?';

            return (
              <Card
                key={trend.id}
                className="transition-all duration-200 shadow-sm flex flex-col hover:border-border/80"
              >
                <CardContent className="p-5 flex flex-col flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm ${meta.sourceColor}`}>
                      {sourceInitial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className={`text-[9px] h-4 px-1 font-medium ${meta.catColor}`}>
                          {meta.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {timeAgo(trend.publishedAt || trend.createdAt)}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate">
                          — {trend.source}
                        </span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={trend.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-sm leading-snug mb-2 text-foreground hover:text-primary transition-colors inline-flex items-start gap-1.5 line-clamp-2"
                  >
                    {trend.title}
                    <ExternalLink className="w-3 h-3 opacity-40 shrink-0 mt-0.5" />
                  </a>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 flex-1">
                    {trend.summary}
                  </p>

                  {/* Analyze Impact button */}
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-7 text-xs bg-background text-muted-foreground hover:text-foreground w-full"
                      onClick={() => {
                        setModalTrend(trend);
                        setAnalysisResult(null);
                      }}
                    >
                      <Sparkles className="w-3 h-3" /> Analyze Impact
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Infinite scroll sentinel */}
        {hasMore && (
          <div ref={sentinelRef} className="flex items-center justify-center py-8 text-muted-foreground gap-2">
            {loadingMore && <><Loader2 className="w-4 h-4 animate-spin" /> Loading more trends...</>}
          </div>
        )}
        {!loading && !hasMore && trends.length > 0 && (
          <p className="text-center text-xs text-muted-foreground py-6">All {total} trends loaded</p>
        )}

        <div className="space-y-6">
          {/* Digest Controls */}
          {!loading && (
            <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Digest Delivery</h3>
                <p className="text-xs text-muted-foreground">
                  Control how often you receive intelligence updates.
                  {schedule?.lastRunAt && (
                    <> Last run: {new Date(schedule.lastRunAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex bg-accent rounded-md p-1 border border-border/50">
                  {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
                    <button
                      key={freq}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                        schedule?.frequency === freq
                          ? 'bg-card shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => handleScheduleChange(freq)}
                      disabled={savingSchedule}
                    >
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </button>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground font-medium">
                  {schedule ? `${schedule.hour}:00 ${schedule.timezone.split('/')[1] || schedule.timezone}` : '8:00 AM EST'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analysis Modal */}
      <Dialog open={!!modalTrend} onOpenChange={(open) => { if (!open) setModalTrend(null); }}>
        {modalTrend && (
          <>
            <DialogClose onClose={() => setModalTrend(null)} />
            <DialogHeader>
              <Badge variant="outline" className={`text-[9px] h-4 px-1 font-medium w-fit mb-2 ${(CATEGORY_META[modalTrend.category] || CATEGORY_META.research).catColor}`}>
                {(CATEGORY_META[modalTrend.category] || CATEGORY_META.research).label}
              </Badge>
              <DialogTitle>{modalTrend.title}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">{modalTrend.source} · {timeAgo(modalTrend.publishedAt || modalTrend.createdAt)}</p>
            </DialogHeader>

            <DialogBody>
              {!analysisResult && !analyzing && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{modalTrend.summary}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium text-foreground">Analyze against:</span>
                    <select
                      className="h-9 rounded-md border border-border bg-card px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-sm"
                      value={analysisClientId}
                      onChange={(e) => setAnalysisClientId(e.target.value)}
                    >
                      <option value="">Select a client...</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      className="gap-2 shadow-sm"
                      onClick={() => handleAnalyze(modalTrend.id)}
                      disabled={analyzing || !analysisClientId}
                    >
                      <Sparkles className="w-4 h-4" /> Run Analysis
                    </Button>
                  </div>
                </div>
              )}

              {analyzing && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <p className="text-sm">Running Strategy Agent analysis...</p>
                  <p className="text-xs">This may take 30–60 seconds</p>
                </div>
              )}

              {analysisResult && !analyzing && (
                <div className="prose-sm">
                  <SuluMarkdown content={analysisResult} />
                </div>
              )}
            </DialogBody>

            {analysisResult && !analyzing && (
              <DialogFooter>
                <Button variant="ghost" size="sm" onClick={() => setAnalysisResult(null)}>
                  Re-run
                </Button>
                <CorrelateButton
                  clientId={analysisClientId}
                  content={`# Trend Impact Analysis: ${modalTrend.title}\n\nTrend URL: ${modalTrend.url}\nCategory: ${modalTrend.category}\nSource: ${modalTrend.source}\n\n${analysisResult}`}
                  contentType="strategy"
                  metadata={{
                    trendId: modalTrend.id,
                    trendTitle: modalTrend.title,
                    trendCategory: modalTrend.category,
                    trendUrl: modalTrend.url,
                    analysisType: 'trend_impact',
                  }}
                />
                <Button variant="outline" size="sm" onClick={() => setModalTrend(null)}>
                  Close
                </Button>
              </DialogFooter>
            )}
          </>
        )}
      </Dialog>
    </div>
  );
}
