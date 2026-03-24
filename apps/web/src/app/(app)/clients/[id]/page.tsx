'use client';

import { useRouter, useParams } from 'next/navigation';

import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  LayoutDashboard,
  Database,
  Rocket,
  Settings as SettingsIcon,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Plus,
  RefreshCw,
  Search as SearchIcon,
  Check,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api'
import { Loader2 } from 'lucide-react'

const CONNECTOR_LABELS: Record<string, { name: string; icon: string }> = {
  ga4: { name: 'Google Analytics 4', icon: 'G' },
  gsc: { name: 'Google Search Console', icon: 'G' },
  meta: { name: 'Meta Ads', icon: 'M' },
  semrush: { name: 'Semrush', icon: 'S' },
  brave: { name: 'Brave Search', icon: 'B' },
  upload: { name: 'Manual Upload', icon: 'U' },
}
export default function ClientDetailPage() {
  const { id } = useParams<{
    id: string
  }>()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [client, setClient] = useState<Record<string, any> | null>(null)
  const [connectors, setConnectors] = useState<Array<{ id: string; connectorType: string; lastSynced: string | null }>>([])
  const [ragStats, setRagStats] = useState<{ total: number } | null>(null)
  const [loading, setLoading] = useState(true)

  // Semrush state
  interface KeywordRow {
    keyword: string; position: number; previousPosition: number; delta: number;
    searchVolume: number; cpc: number; traffic: number; trafficCost: number;
    competition: number; url: string; serpFeatures: string[];
  }
  interface CompetitorRow {
    domain: string; commonKeywords: number; organicTraffic: number;
    paidTraffic: number; organicKeywords: number; adwordsKeywords: number;
  }
  interface DomainOverview {
    domain: string; organicSearchTraffic: number; organicSearchTrafficCost: number;
    paidSearchTraffic: number; paidSearchTrafficCost: number;
    organicKeywords: number; paidKeywords: number; backlinks: number;
    referringDomains: number; authorityScore: number;
    organicTrafficTrend: { month: string; traffic: number }[];
  }
  const [keywords, setKeywords] = useState<KeywordRow[]>([])
  const [competitors, setCompetitors] = useState<CompetitorRow[]>([])
  const [overview, setOverview] = useState<DomainOverview | null>(null)
  const [kwLoading, setKwLoading] = useState(false)
  const [kwSort, setKwSort] = useState<'traffic' | 'position' | 'searchVolume'>('traffic')
  const [storingRag, setStoringRag] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      apiFetch<Record<string, any>>(`/api/clients/${id}`).catch(() => null),
      apiFetch<Array<{ id: string; connectorType: string; lastSynced: string | null }>>(`/api/connectors/${id}`).catch(() => []),
      apiFetch<{ total: number }>(`/api/rag/${id}/stats`).catch(() => ({ total: 0 })),
    ]).then(([clientData, connData, stats]) => {
      if (clientData) {
        setClient({
          ...clientData,
          domain: clientData.domains?.[0] || '',
          status: 'Active',
          statusColor: 'bg-emerald-500',
          am: '',
          onboardingProgress: connData && connData.length > 0 ? 100 : 25,
          sources: (connData || []).map((c: any) => ({
            name: CONNECTOR_LABELS[c.connectorType]?.name || c.connectorType,
            icon: CONNECTOR_LABELS[c.connectorType]?.icon || c.connectorType[0].toUpperCase(),
            status: 'Connected',
            lastSync: c.lastSynced ? new Date(c.lastSynced).toLocaleString() : 'Never',
          })),
          team: [],
          config: {
            goals: clientData.goalsText || '',
            nuance: clientData.nuanceText || '',
            blacklist: (clientData.blacklist || []).join(', '),
          },
        })
      }
      setConnectors(connData || [])
      setRagStats(stats)
    }).finally(() => setLoading(false))
  }, [id])

  // Fetch Semrush data when Keywords tab is activated
  useEffect(() => {
    if (activeTab !== 'keywords' || !id || kwLoading) return
    setKwLoading(true)
    Promise.all([
      apiFetch<{ keywords: KeywordRow[] }>(`/api/semrush/${id}/keywords?sort=${kwSort}&limit=50`).catch(() => ({ keywords: [] })),
      apiFetch<{ competitors: CompetitorRow[] }>(`/api/semrush/${id}/competitors`).catch(() => ({ competitors: [] })),
      apiFetch<DomainOverview>(`/api/semrush/${id}/overview`).catch(() => null),
    ]).then(([kwData, compData, ovData]) => {
      setKeywords(kwData.keywords || [])
      setCompetitors(compData.competitors || [])
      if (ovData) setOverview(ovData)
    }).finally(() => setKwLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, id])

  const handleStoreRag = async () => {
    if (!id) return
    setStoringRag(true)
    try {
      await apiFetch(`/api/semrush/${id}/store-rag`, { method: 'POST', body: {} })
    } catch { /* empty */ }
    setStoringRag(false)
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading client...
      </div>
    )
  }

  if (!client) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Client not found.
      </div>
    )
  }
  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'sources',
      label: 'Connected Sources',
      icon: Database,
    },
    {
      id: 'onboarding',
      label: 'Onboarding',
      icon: Rocket,
    },
    {
      id: 'configuration',
      label: 'Configuration',
      icon: SettingsIcon,
    },
    {
      id: 'keywords',
      label: 'Keywords',
      icon: SearchIcon,
    },
    {
      id: 'team',
      label: 'Team',
      icon: Users,
    },
  ]
  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="shrink-0 p-8 pb-6 max-w-7xl mx-auto w-full">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 text-muted-foreground hover:text-foreground -ml-3"
          onClick={() => router.push('/clients')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Clients
        </Button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400 font-bold text-xl flex-shrink-0 shadow-sm">
              {client.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {client.name}
                </h1>
                <Badge
                  variant="outline"
                  className="font-normal shadow-none bg-background"
                >
                  {client.industry}
                </Badge>
                <Badge
                  variant="secondary"
                  className="font-medium shadow-none gap-1.5"
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${client.statusColor}`}
                  ></div>
                  {client.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <a
                  href={`https://${client.domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  {client.domain} <ExternalLink className="w-3 h-3" />
                </a>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> AM: {client.am}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2 bg-background shadow-sm"
              onClick={() => window.open(`/portal?clientId=${id}`, '_blank')}
            >
              <ExternalLink className="w-4 h-4 text-muted-foreground" /> Client
              Portal
            </Button>
            <Button className="gap-2 shadow-sm">
              <RefreshCw className="w-4 h-4" /> Sync All Data
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row mx-8 mb-8 max-w-7xl border border-border rounded-xl overflow-hidden bg-card shadow-sm">
        {/* Left Sub-nav */}
        <div className="w-full md:w-64 border-r border-border bg-accent/30 p-4 space-y-1 flex-shrink-0 overflow-y-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2.5 rounded-md text-sm font-medium cursor-pointer transition-colors flex items-center gap-3 ${activeTab === tab.id ? 'bg-card text-primary border-l-2 border-primary shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground border-l-2 border-transparent'}`}
            >
              <tab.icon
                className={`w-4 h-4 ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'}`}
              />
              {tab.label}
            </div>
          ))}
        </div>

        {/* Right Content Area */}
        <div className="flex-1 min-w-0 p-6 md:p-8 overflow-y-auto overflow-x-hidden bg-background">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Overview
                </h2>
                <p className="text-sm text-muted-foreground">
                  High-level snapshot of client health and data status.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="shadow-sm border-border/50">
                  <CardContent className="p-5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Data Health
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <span className="text-xl font-semibold text-foreground">
                        Excellent
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      All{' '}
                      {
                        client.sources.filter(
                          (s: any) => s.status === 'Connected',
                        ).length
                      }{' '}
                      sources syncing normally.
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-border/50">
                  <CardContent className="p-5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      RAG Documents
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="w-5 h-5 text-blue-500" />
                      <span className="text-xl font-semibold text-foreground">
                        {ragStats?.total || 0}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Chunks indexed for Strategy Agent.
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-border/50">
                  <CardContent className="p-5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Last Report
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-purple-500" />
                      <span className="text-xl font-semibold text-foreground">
                        Oct 1st
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Q3 Performance Review generated.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-sm border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0 mt-0.5">
                        <RefreshCw className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Automated Data Pull Completed
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Synced GA4, Meta Ads, and Semrush data for the past 24
                          hours.
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          2 hours ago
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0 mt-0.5">
                        <SettingsIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Configuration Updated
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Sarah Chen updated the client goals and nuance fields.
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Yesterday
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* SOURCES TAB */}
          {activeTab === 'sources' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Connected Sources
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Manage data pipelines and connector credentials.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 shadow-sm bg-background"
                >
                  <Plus className="w-4 h-4" /> Add Source
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {client.sources.map((source: any, i: number) => (
                  <Card key={i} className="shadow-sm border-border/50">
                    <CardContent className="p-5 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center font-bold text-foreground shadow-sm">
                            {source.icon}
                          </div>
                          <div>
                            <h3 className="font-medium text-foreground">
                              {source.name}
                            </h3>
                            <Badge
                              variant="outline"
                              className={`mt-1 text-[10px] h-4 px-1.5 shadow-none border-transparent ${source.status === 'Connected' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}
                            >
                              {source.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="w-10 h-5 rounded-full bg-primary p-0.5 cursor-pointer flex-shrink-0">
                          <div
                            className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${source.status === 'Connected' ? 'translate-x-5' : 'translate-x-0'}`}
                          ></div>
                        </div>
                      </div>
                      <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> Last sync:{' '}
                          {source.lastSync}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-primary hover:text-primary hover:bg-primary/10"
                        >
                          Configure
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Manual Upload Card */}
                <Card className="shadow-sm border-border/50 border-dashed bg-accent/10 hover:bg-accent/20 transition-colors cursor-pointer">
                  <CardContent className="p-5 flex flex-col items-center justify-center h-full min-h-[140px] text-center">
                    <div className="w-10 h-10 rounded-full bg-background border border-border/50 flex items-center justify-center mb-3 shadow-sm">
                      <Plus className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium text-foreground text-sm">
                      Manual Data Upload
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload CSV or Excel files
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ONBOARDING TAB */}
          {activeTab === 'onboarding' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Onboarding Flow
                </h2>
                <p className="text-sm text-muted-foreground">
                  Track the initial setup and data ingestion process.
                </p>
              </div>

              <Card className="shadow-sm border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex-1">
                      <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-500"
                          style={{
                            width: `${client.onboardingProgress}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <span className="ml-4 text-sm font-medium text-foreground">
                      {client.onboardingProgress}% Complete
                    </span>
                  </div>

                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                    {/* Step 1 */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-primary bg-background text-primary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        <Check className="w-5 h-5" />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border/50 bg-card shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-sm text-foreground">
                            Domain & Basic Info
                          </h3>
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-200 shadow-none"
                          >
                            Done
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Initial client profile created and domain verified.
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-primary bg-background text-primary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        {client.onboardingProgress >= 50 ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <span className="text-sm font-bold">2</span>
                        )}
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border/50 bg-card shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-sm text-foreground">
                            Baseline Data Pull
                          </h3>
                          <Badge
                            variant="outline"
                            className={`text-[10px] shadow-none ${client.onboardingProgress >= 50 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}
                          >
                            {client.onboardingProgress >= 50
                              ? 'Done'
                              : 'In Progress'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Connect sources to pull historical data (min 90 days).
                        </p>
                        {client.onboardingProgress < 50 && (
                          <Button size="sm" className="mt-3 w-full text-xs h-8">
                            Trigger Pull
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-full border-2 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${client.onboardingProgress >= 75 ? 'border-primary bg-background text-primary' : 'border-border bg-accent text-muted-foreground'}`}
                      >
                        {client.onboardingProgress >= 75 ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <span className="text-sm font-bold">3</span>
                        )}
                      </div>
                      <div
                        className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border shadow-sm ${client.onboardingProgress >= 50 ? 'border-border/50 bg-card' : 'border-border/30 bg-card/50 opacity-60'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-sm text-foreground">
                            History Brief Generation
                          </h3>
                          {client.onboardingProgress >= 75 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-200 shadow-none"
                            >
                              Done
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          AI generates a pre-agent summary of historical
                          performance.
                        </p>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-full border-2 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${client.onboardingProgress >= 100 ? 'border-primary bg-background text-primary' : 'border-border bg-accent text-muted-foreground'}`}
                      >
                        {client.onboardingProgress >= 100 ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <span className="text-sm font-bold">4</span>
                        )}
                      </div>
                      <div
                        className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border shadow-sm ${client.onboardingProgress >= 75 ? 'border-border/50 bg-card' : 'border-border/30 bg-card/50 opacity-60'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-sm text-foreground">
                            RAG Seed Creation
                          </h3>
                          {client.onboardingProgress >= 100 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-200 shadow-none"
                            >
                              Done
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Embed and store the history brief for Strategy Agent
                          context.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* CONFIGURATION TAB */}
          {activeTab === 'configuration' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Manual Enrichment
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Provide context to guide the Strategy Agent's analysis.
                  </p>
                </div>
                <Button size="sm" className="shadow-sm">
                  Save Changes
                </Button>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Client Goals & KPIs
                  </label>
                  <p className="text-xs text-muted-foreground">
                    What are the primary business objectives for this period?
                  </p>
                  <textarea
                    className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background text-sm focus:ring-1 focus:ring-primary outline-none shadow-sm"
                    defaultValue={client.config.goals}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Strategic Nuance
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Context about their audience, market positioning, or
                    internal constraints.
                  </p>
                  <textarea
                    className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background text-sm focus:ring-1 focus:ring-primary outline-none shadow-sm"
                    defaultValue={client.config.nuance}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Blacklist Terms
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list of terms the AI should avoid using in
                    narratives.
                  </p>
                  <Input
                    className="bg-background shadow-sm"
                    defaultValue={client.config.blacklist}
                  />
                </div>
              </div>
            </div>
          )}

          {/* KEYWORDS TAB */}
          {activeTab === 'keywords' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Keyword Rankings</h2>
                  <p className="text-sm text-muted-foreground">Semrush keyword positions, competitive intelligence, and SERP features.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2 bg-background shadow-sm" onClick={handleStoreRag} disabled={storingRag}>
                    <Database className="w-4 h-4" /> {storingRag ? 'Storing...' : 'Store in RAG'}
                  </Button>
                </div>
              </div>

              {kwLoading && (
                <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Loading Semrush data...
                </div>
              )}

              {!kwLoading && overview && (
                <>
                  {/* Domain Overview Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="shadow-sm border-border/50">
                      <CardContent className="p-4">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Authority Score</p>
                        <span className="text-2xl font-bold text-foreground">{overview.authorityScore}</span>
                      </CardContent>
                    </Card>
                    <Card className="shadow-sm border-border/50">
                      <CardContent className="p-4">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Organic Traffic</p>
                        <span className="text-2xl font-bold text-foreground">{(overview.organicSearchTraffic / 1000).toFixed(0)}K</span>
                      </CardContent>
                    </Card>
                    <Card className="shadow-sm border-border/50">
                      <CardContent className="p-4">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Organic Keywords</p>
                        <span className="text-2xl font-bold text-foreground">{overview.organicKeywords.toLocaleString()}</span>
                      </CardContent>
                    </Card>
                    <Card className="shadow-sm border-border/50">
                      <CardContent className="p-4">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Backlinks</p>
                        <span className="text-2xl font-bold text-foreground">{(overview.backlinks / 1000).toFixed(0)}K</span>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Keyword Rankings Table */}
                  <Card className="shadow-sm border-border/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold">Keyword Rankings ({keywords.length})</CardTitle>
                        <div className="flex gap-1">
                          {(['traffic', 'position', 'searchVolume'] as const).map((s) => (
                            <button
                              key={s}
                              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${kwSort === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
                              onClick={() => {
                                setKwSort(s)
                                const sorted = [...keywords].sort((a, b) => s === 'position' ? a[s] - b[s] : b[s] - a[s])
                                setKeywords(sorted)
                              }}
                            >
                              {s === 'traffic' ? 'Traffic' : s === 'position' ? 'Position' : 'Volume'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-accent/30 text-muted-foreground border-y border-border/50">
                            <tr>
                              <th className="px-4 py-2.5 text-left font-medium">Keyword</th>
                              <th className="px-3 py-2.5 text-center font-medium w-16">Pos</th>
                              <th className="px-3 py-2.5 text-center font-medium w-16">Δ</th>
                              <th className="px-3 py-2.5 text-right font-medium w-20">Volume</th>
                              <th className="px-3 py-2.5 text-right font-medium w-20">Traffic</th>
                              <th className="px-3 py-2.5 text-right font-medium w-16">CPC</th>
                              <th className="px-4 py-2.5 text-left font-medium">SERP Features</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                            {keywords.map((kw, i) => (
                              <tr key={i} className="hover:bg-accent/10 transition-colors">
                                <td className="px-4 py-2.5">
                                  <div className="font-medium text-foreground text-sm truncate max-w-[200px]">{kw.keyword}</div>
                                  <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">{kw.url}</div>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <span className={`font-mono font-semibold ${kw.position <= 3 ? 'text-emerald-500' : kw.position <= 10 ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {kw.position}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  {kw.delta > 0 ? (
                                    <span className="inline-flex items-center gap-0.5 text-emerald-500 font-medium text-xs">
                                      <ArrowUpRight className="w-3 h-3" /> {kw.delta}
                                    </span>
                                  ) : kw.delta < 0 ? (
                                    <span className="inline-flex items-center gap-0.5 text-red-500 font-medium text-xs">
                                      <ArrowDownRight className="w-3 h-3" /> {Math.abs(kw.delta)}
                                    </span>
                                  ) : (
                                    <Minus className="w-3 h-3 text-muted-foreground mx-auto" />
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono text-xs">{kw.searchVolume.toLocaleString()}</td>
                                <td className="px-3 py-2.5 text-right font-mono text-xs">{kw.traffic.toFixed(1)}%</td>
                                <td className="px-3 py-2.5 text-right font-mono text-xs">${kw.cpc.toFixed(2)}</td>
                                <td className="px-4 py-2.5">
                                  <div className="flex flex-wrap gap-1">
                                    {kw.serpFeatures.map((feat, fi) => (
                                      <Badge key={fi} variant="outline" className={`text-[9px] h-4 px-1 shadow-none ${feat.includes('AI') ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-accent text-muted-foreground border-border/50'}`}>
                                        {feat}
                                      </Badge>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Competitive Intelligence */}
                  <Card className="shadow-sm border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold">Competitive Intelligence</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-accent/30 text-muted-foreground border-y border-border/50">
                            <tr>
                              <th className="px-4 py-2.5 text-left font-medium">Competitor</th>
                              <th className="px-3 py-2.5 text-right font-medium">Common KWs</th>
                              <th className="px-3 py-2.5 text-right font-medium">Organic Traffic</th>
                              <th className="px-3 py-2.5 text-right font-medium">Organic KWs</th>
                              <th className="px-3 py-2.5 text-right font-medium">Paid Traffic</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                            {competitors.map((comp, i) => (
                              <tr key={i} className="hover:bg-accent/10 transition-colors">
                                <td className="px-4 py-2.5 font-medium text-foreground">{comp.domain}</td>
                                <td className="px-3 py-2.5 text-right font-mono text-xs">{comp.commonKeywords.toLocaleString()}</td>
                                <td className="px-3 py-2.5 text-right font-mono text-xs">{comp.organicTraffic.toLocaleString()}</td>
                                <td className="px-3 py-2.5 text-right font-mono text-xs">{comp.organicKeywords.toLocaleString()}</td>
                                <td className="px-3 py-2.5 text-right font-mono text-xs">{comp.paidTraffic.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {!kwLoading && !overview && keywords.length === 0 && (
                <div className="text-center py-16">
                  <SearchIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground mb-2">No Semrush data available</p>
                  <p className="text-xs text-muted-foreground">Connect Semrush in the Sources tab or run a data pull to see keyword rankings.</p>
                </div>
              )}
            </div>
          )}

          {/* TEAM TAB */}
          {activeTab === 'team' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Assigned Team
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Manage who has access to this client's data.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 shadow-sm bg-background"
                >
                  <Plus className="w-4 h-4" /> Assign User
                </Button>
              </div>

              <div className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-accent/30 text-muted-foreground border-b border-border/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {client.team.map((member: any, i: number) => (
                      <tr
                        key={i}
                        className="hover:bg-accent/10 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">
                            {member.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {member.email}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className="font-normal shadow-none bg-background border-border/60"
                          >
                            {member.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

