'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  TrendingUp,
  FileText,
  BarChart3,
  Sparkles,
  ExternalLink,
  Loader2,
  LogOut,
  Rocket,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

interface ReportSummary {
  id: string;
  title: string;
  createdAt: string;
  createdByAgent: string | null;
}

interface TrendSummary {
  id: string;
  title: string;
  category: string;
  source: string;
  publishedAt: string | null;
  createdAt: string;
}

interface MetricSnapshot {
  connector: string;
  rowCount: number | null;
  lastSync: string | null;
}

const CONNECTOR_NAMES: Record<string, string> = {
  ga4: 'Google Analytics 4',
  gsc: 'Google Search Console',
  meta: 'Meta Ads',
  semrush: 'Semrush',
};

const CATEGORY_LABELS: Record<string, string> = {
  seo: 'SEO',
  geo_ai_visibility: 'GEO/AI',
  paid_media: 'Paid Media',
  research: 'Research',
};

export default function PortalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading your portal...
      </div>
    }>
      <PortalContent />
    </Suspense>
  );
}

function PortalContent() {
  const { user, logout } = useAuth();
  const searchParams = useSearchParams();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [trends, setTrends] = useState<TrendSummary[]>([]);
  const [trendsTotal, setTrendsTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [clientName, setClientName] = useState('');
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const TRENDS_PAGE_SIZE = 12;

  // Support ?clientId= query param (for admin preview), fallback to first assigned client
  const paramClientId = searchParams.get('clientId') || user?.assignedClientIds?.[0] || null;

  // Resolve clientId: for admin/leadership with no assigned clients, fetch the first available
  useEffect(() => {
    if (paramClientId) {
      setResolvedClientId(paramClientId);
      return;
    }
    // Admin/leadership can see all clients — auto-pick the first one
    if (user?.role === 'admin' || user?.role === 'leadership') {
      apiFetch<Array<{ id: string }>>('/api/clients')
        .then((clients) => {
          if (clients.length > 0) setResolvedClientId(clients[0].id);
          else setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [paramClientId, user?.role]);

  const fetchPortalData = useCallback(async () => {
    if (!resolvedClientId) return;
    setLoading(true);
    try {
      const [clientData, reportsData, trendsData] = await Promise.all([
        apiFetch<{ name: string }>(`/api/clients/${resolvedClientId}`).catch(() => null),
        apiFetch<ReportSummary[]>(`/api/reports/${resolvedClientId}`).catch(() => []),
        apiFetch<{ items: TrendSummary[]; total: number }>('/api/trends?limit=12').catch(() => ({ items: [], total: 0 })),
      ]);

      if (clientData) {
        setClientName(clientData.name || '');
      }

      // Reports API returns a flat array
      const reportsList = Array.isArray(reportsData) ? reportsData.slice(0, 5) : [];
      setReports(reportsList);
      setTrends(trendsData.items || []);
      setTrendsTotal(trendsData.total || 0);
    } catch { /* empty */ }
    setLoading(false);
  }, [resolvedClientId]);

  useEffect(() => { fetchPortalData(); }, [fetchPortalData]);

  const loadMoreTrends = useCallback(async () => {
    setLoadingMore(true);
    try {
      const data = await apiFetch<{ items: TrendSummary[]; total: number }>(
        `/api/trends?limit=${TRENDS_PAGE_SIZE}&offset=${trends.length}`
      );
      setTrends((prev) => [...prev, ...(data.items || [])]);
      setTrendsTotal(data.total || 0);
    } catch { /* empty */ }
    setLoadingMore(false);
  }, [trends.length, TRENDS_PAGE_SIZE]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading your portal...
      </div>
    );
  }

  if (!resolvedClientId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Rocket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">No Client Assigned</h1>
          <p className="text-muted-foreground">Please contact your account manager to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Portal Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Rocket className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-lg leading-tight">
                {clientName || 'Client Portal'}
              </h1>
              <p className="text-xs text-muted-foreground">Powered by Growth Rocket</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={logout}>
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Portal Content */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Welcome Section */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">
            Welcome back{user?.name ? `, ${user.name}` : ''}
          </h2>
          <p className="text-muted-foreground">
            Here&apos;s your latest performance data and intelligence reports.
          </p>
        </div>

        {/* Metric Snapshot Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reports</p>
                  <span className="text-2xl font-bold text-foreground">{reports.length}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {reports.length > 0 ? `Latest: ${reports[0].title}` : 'No reports generated yet.'}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Trends</p>
                  <span className="text-2xl font-bold text-foreground">{trends.length}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Latest industry intelligence signals.</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AI Insights</p>
                  <span className="text-2xl font-bold text-foreground">Active</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Strategy Agent monitoring your data.</p>
            </CardContent>
          </Card>
        </div>

        {/* Latest Reports */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Latest Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No reports available yet. Your team is working on it!</p>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-accent/30 transition-colors">
                    <div>
                      <h4 className="font-medium text-foreground text-sm">{report.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {report.createdByAgent && (
                          <> · Generated by {report.createdByAgent} agent</>
                        )}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-background shadow-none">
                      <FileText className="w-3 h-3 mr-1" /> View
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Trends */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-500" /> Industry Trends
              </CardTitle>
              {trendsTotal > 0 && (
                <span className="text-xs text-muted-foreground">{trends.length} of {trendsTotal}</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {trends.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No trends available yet.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {trends.map((trend) => (
                    <div key={trend.id} className="p-3 rounded-lg border border-border/50 hover:bg-accent/30 transition-colors flex flex-col justify-between min-h-[80px]">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-[9px] h-4 px-1 shadow-none shrink-0">
                          {CATEGORY_LABELS[trend.category] || trend.category}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground truncate">{trend.source}</span>
                      </div>
                      <h4 className="font-medium text-foreground text-sm line-clamp-2 leading-snug">{trend.title}</h4>
                    </div>
                  ))}
                </div>
                {trends.length < trendsTotal && (
                  <div className="flex justify-center mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-muted-foreground"
                      onClick={loadMoreTrends}
                      disabled={loadingMore}
                    >
                      {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
                      {loadingMore ? 'Loading...' : `Load More (${trendsTotal - trends.length} remaining)`}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="pt-6 border-t border-border text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Rocket className="w-4 h-4" />
            <span className="text-xs font-medium">Growth Rocket · Telemetry Platform</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            © {new Date().getFullYear()} Growth Rocket. All data is confidential.
          </p>
        </div>
      </div>
    </div>
  );
}
