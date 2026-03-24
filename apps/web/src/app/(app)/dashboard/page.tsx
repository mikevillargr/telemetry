'use client';

import { useState, useCallback, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from '@/components/ui/dialog'
import {
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  RefreshCw,
  Sparkles,
  UploadCloud,
  X,
  TrendingUp,
  Link2,
  Download,
  ClipboardCopy,
  Hammer,
  LayoutDashboard,
  Loader2,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useRouter } from 'next/navigation'
import { AIInsightsModal } from '@/components/modals/ai-insights-modal'
import { DateFilterBar } from '@/components/filters/date-filter-bar'
import { DataImportView } from '@/components/views/data-import-view'
import { CorrelateButton } from '@/components/correlate-button'
import { useClient } from '@/lib/client-context'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import { StrategyAgentAnalysis } from '@/components/dashboard/strategy-agent-analysis'
import { SuluMarkdown } from '@/components/sulu/sulu-markdown'

function timeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

const trafficData = [
  {
    date: 'Oct 1',
    sessions: 4000,
    conversions: 240,
  },
  {
    date: 'Oct 5',
    sessions: 3000,
    conversions: 139,
  },
  {
    date: 'Oct 10',
    sessions: 2000,
    conversions: 980,
  },
  {
    date: 'Oct 15',
    sessions: 2780,
    conversions: 390,
  },
  {
    date: 'Oct 20',
    sessions: 1890,
    conversions: 480,
  },
  {
    date: 'Oct 25',
    sessions: 2390,
    conversions: 380,
  },
  {
    date: 'Oct 30',
    sessions: 3490,
    conversions: 430,
  },
]
const channelData = [
  {
    name: 'Organic Search',
    value: 400,
  },
  {
    name: 'Direct',
    value: 300,
  },
  {
    name: 'Paid Search',
    value: 300,
  },
  {
    name: 'Social',
    value: 200,
  },
]
const COLORS = ['#3B82F6', '#E8450A', '#10B981', '#8B5CF6']
function StatCard({
  title,
  value,
  change,
  trend,
  sparklineData,
  onRemove,
}: any) {
  const isPositive = trend === 'up'
  return (
    <Card className="shadow-sm h-full border-border/50 hover:border-border transition-colors group relative">
      {/* Hover controls */}
      <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          className="w-6 h-6 rounded-full bg-background/80 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent shadow-sm transition-colors"
          title="Copy to clipboard"
        >
          <ClipboardCopy className="w-3 h-3" />
        </button>
        <button
          className="w-6 h-6 rounded-full bg-background/80 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent shadow-sm transition-colors"
          title="Download"
        >
          <Download className="w-3 h-3" />
        </button>
        <button
          onClick={onRemove}
          className="w-6 h-6 rounded-full bg-background/80 border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive shadow-sm transition-colors"
          title="Remove from dashboard"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <CardContent className="p-5 flex flex-col h-full">
        <div className="flex justify-between items-start mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          <Badge
            variant={isPositive ? 'success' : 'destructive'}
            className="flex items-center gap-1 px-1.5 py-0 shadow-none font-medium"
          >
            {isPositive ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            {change}
          </Badge>
        </div>
        <div className="text-3xl font-mono font-bold text-foreground tracking-tight">
          {value}
        </div>
        <div className="h-10 mt-auto w-full opacity-70 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData}>
              <defs>
                <linearGradient
                  id={`colorSparkline${title}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={isPositive ? '#10B981' : '#EF4444'}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={isPositive ? '#10B981' : '#EF4444'}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={isPositive ? '#10B981' : '#EF4444'}
                fillOpacity={1}
                fill={`url(#colorSparkline${title})`}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
export default function DashboardPage() {
  const router = useRouter()
  const { clients, selectedClient, setSelectedClient, loading: clientLoading } = useClient()
  const [isInsightsOpen, setIsInsightsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'stream' | 'import'>('stream')
  const [hiddenCards, setHiddenCards] = useState<string[]>([])
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)
  const [pulling, setPulling] = useState(false)
  const [pullMessage, setPullMessage] = useState<string | null>(null)
  const [dashData, setDashData] = useState<{
    metrics: Array<{ title: string; value: string; change: string; trend: 'up' | 'down'; sparkline: number[] }>;
    trafficData: Array<{ date: string; sessions: number; conversions: number }>;
    channelData: Array<{ name: string; value: number }>;
    lastPullAt: string | null;
  } | null>(null)
  const [analysisData, setAnalysisData] = useState<{
    narrative: string[];
    keyObservations: Array<{
      type: 'opportunity' | 'risk' | 'emerging';
      headline: string;
      description: string;
    }>;
    recommendedActions: Array<{
      priority: 'urgent' | 'high' | 'medium';
      action: string;
    }>;
    lastPullAt: string | null;
  } | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [trendsData, setTrendsData] = useState<Array<{
    id: string;
    title: string;
    summary: string;
    category: string;
    source: string;
    publishedAt: string;
  }>>([])
  const [analyzeModalTrend, setAnalyzeModalTrend] = useState<{
    id: string;
    title: string;
    summary: string;
    category: string;
    source: string;
    publishedAt: string;
    url?: string;
  } | null>(null)
  const [analysisResult, setAnalysisResult] = useState<string | null>(null)
  const [analyzingTrend, setAnalyzingTrend] = useState(false)
  const [analysisClientId, setAnalysisClientId] = useState('')
  
  // Use refs to prevent infinite loops
  const hasFetchedDashboard = useRef(false)
  const hasFetchedAnalysis = useRef(false)
  const hasFetchedTrends = useRef(false)
  const lastClientId = useRef<string | null>(null)
  const isFetchingAnalysis = useRef(false)

  const fetchDashboard = useCallback(async () => {
    if (!selectedClient) return
    try {
      const data = await apiFetch<typeof dashData>(`/api/dashboard/${selectedClient.id}`)
      if (data && (data.metrics.length > 0 || data.trafficData.length > 0)) {
        setDashData(data)
      }
    } catch { /* silent — fall back to mock */ }
  }, [selectedClient])

  useEffect(() => {
    if (!selectedClient) return
    const clientId = selectedClient.id
    if (lastClientId.current === clientId && hasFetchedDashboard.current) return
    
    const fetchDashboardData = async () => {
      try {
        const data = await apiFetch<typeof dashData>(`/api/dashboard/${clientId}`)
        if (data && (data.metrics.length > 0 || data.trafficData.length > 0)) {
          setDashData(data)
        }
      } catch { /* silent — fall back to mock */ }
    }
    
    fetchDashboardData()
    hasFetchedDashboard.current = true
    lastClientId.current = clientId
  }, [selectedClient?.id])

  const fetchAnalysis = useCallback(async () => {
    if (!selectedClient) return
    setAnalyzing(true)
    try {
      const data = await apiFetch<{
        narrative: string[];
        keyObservations: Array<{
          type: 'opportunity' | 'risk' | 'emerging';
          headline: string;
          description: string;
        }>;
        recommendedActions: Array<{
          priority: 'urgent' | 'high' | 'medium';
          action: string;
        }>;
        lastPullAt: string | null;
      }>(
        `/api/dashboard/${selectedClient.id}/analyze`,
        { method: 'POST', body: {} }
      )
      setAnalysisData(data)
    } catch (err) {
      console.error('Analysis fetch error:', err)
    } finally {
      setAnalyzing(false)
    }
  }, [selectedClient?.id])

  useEffect(() => {
    if (!selectedClient) return
    const clientId = selectedClient.id
    
    // Only skip if we've already fetched for this exact client
    if (lastClientId.current === clientId && hasFetchedAnalysis.current && hasFetchedTrends.current) return
    
    const fetchAnalysisData = async () => {
      if (isFetchingAnalysis.current) return
      isFetchingAnalysis.current = true
      setAnalyzing(true)
      try {
        // First try to get persisted analysis
        const data = await apiFetch<{
          narrative: string[];
          keyObservations: Array<{
            type: 'opportunity' | 'risk' | 'emerging';
            headline: string;
            description: string;
          }>;
          recommendedActions: Array<{
            priority: 'urgent' | 'high' | 'medium';
            action: string;
          }>;
          lastPullAt: string | null;
        }>(
          `/api/dashboard/${clientId}/analysis`
        )
        setAnalysisData(data)
      } catch (err) {
        console.error('Analysis fetch error:', err)
        // Fallback to mock analysis
        setAnalysisData({
          narrative: [
            `Based on the current performance data for ${selectedClient.name}, we're seeing strong momentum across organic and paid channels. Sessions are up 15.4% compared to the previous period, with 1,240 conversions representing a 4.3% increase. Search visibility has improved with average position reaching 12.4, though CTR has declined slightly to 3.8%.`,
            `The data suggests opportunities for optimization in click-through rates and ROAS management. With impressions up 12.5%, there's significant potential to capture more traffic through strategic content expansion and meta optimization. Current ROAS of 4.2x is solid but trending down, indicating a need to review high-spend keywords and adjust bidding strategies.`
          ],
          keyObservations: [
            {
              type: 'opportunity',
              headline: 'Strong Traffic Growth Momentum',
              description: 'Sessions increased 15.4% with improved search visibility. Average position reached 12.4, indicating successful SEO efforts and content strategy.'
            },
            {
              type: 'risk',
              headline: 'Declining Click-Through Rate',
              description: 'CTR dropped 1.1% despite improved rankings. This suggests meta descriptions and titles may need refreshing to better match user intent.'
            },
            {
              type: 'emerging',
              headline: 'Impression Volume Expansion',
              description: 'Impressions up 12.5% presents opportunity for content expansion. Focus on high-impression, low-CTR queries to capture additional traffic.'
            }
          ],
          recommendedActions: [
            {
              priority: 'urgent',
              action: 'Audit top 20 pages for title tag and meta description optimization to improve CTR'
            },
            {
              priority: 'high',
              action: 'Review high-spend keywords and adjust bids to improve ROAS trending'
            },
            {
              priority: 'medium',
              action: 'Implement A/B testing on ad creative for paid campaigns'
            },
            {
              priority: 'medium',
              action: 'Analyze search console data for featured snippet opportunities'
            }
          ],
          lastPullAt: null
        })
      } finally {
        setAnalyzing(false)
        isFetchingAnalysis.current = false
        hasFetchedAnalysis.current = true
      }
    }
    
    const fetchTrendsData = async () => {
      try {
        const data = await apiFetch<{ items: Array<{ id: string; title: string; summary: string; category: string; source: string; publishedAt: string }> }>(
          '/api/trends?limit=10'
        )
        if (data.items && data.items.length > 0) {
          setTrendsData(data.items)
        } else {
          throw new Error('No trends returned from API')
        }
      } catch (err) {
        console.log('Trends fetch failed, using mock data:', err)
        // Fallback to mock trends
        setTrendsData([
          {
            id: 'mock-1',
            title: 'Google Announces Major Core Algorithm Update for March 2026',
            summary: 'Google has confirmed a significant core algorithm update rolling out over the next two weeks. Early data suggests increased emphasis on E-E-A-T signals and user engagement metrics. Sites with strong author credentials and comprehensive content are seeing positive movement.',
            category: 'seo',
            source: 'Search Engine Land',
            publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'mock-2',
            title: 'ChatGPT Search Now Includes Real-Time Shopping Results',
            summary: 'OpenAI has integrated shopping capabilities into ChatGPT search, allowing users to compare prices and read reviews directly in chat. This represents a major shift in how consumers discover and evaluate products, potentially impacting traditional e-commerce SEO strategies.',
            category: 'geo_ai_visibility',
            source: 'The Verge AI',
            publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'mock-3',
            title: 'Meta Ads Platform Introduces AI-Powered Budget Optimization',
            summary: 'Meta has launched a new AI-driven budget allocation system that automatically shifts spend between campaigns based on real-time performance signals. Beta testers report 18-25% improvement in ROAS with minimal manual intervention required.',
            category: 'paid_media',
            source: 'Social Media Examiner',
            publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
          }
        ])
      } finally {
        hasFetchedTrends.current = true
      }
    }
    
    fetchAnalysisData()
    fetchTrendsData()
    lastClientId.current = clientId
  }, [selectedClient?.id])

  const handleAnalyzeTrend = async (trendId: string) => {
    if (!analysisClientId || analyzingTrend) return
    setAnalyzingTrend(true)
    try {
      const data = await apiFetch<{ analysis: string }>(
        `/api/trends/${trendId}/analyze`,
        { method: 'POST', body: { clientId: analysisClientId } }
      )
      setAnalysisResult(data.analysis)
    } catch (err) {
      console.error('Trend analysis error:', err)
    } finally {
      setAnalyzingTrend(false)
    }
  }

  const handlePullData = useCallback(async () => {
    if (!selectedClient || pulling) return
    setPulling(true)
    setPullMessage(null)
    try {
      // Pull from all connected connectors (GA4 for now)
      const connectors = await apiFetch<Array<{ id: string; connectorType: string }>>(
        `/api/connectors/${selectedClient.id}`
      )
      if (connectors.length === 0) {
        setPullMessage('No connectors configured. Add one in Client > Sources.')
        return
      }
      const now = new Date()
      const dateEnd = now.toISOString().split('T')[0]
      const dateStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      let totalRows = 0
      for (const conn of connectors) {
        try {
          const result = await apiFetch<{ status: string; rowCount: number }>(
            `/api/connectors/${selectedClient.id}/${conn.connectorType}/pull`,
            { method: 'POST', body: { dateRangeStart: dateStart, dateRangeEnd: dateEnd } }
          )
          totalRows += result.rowCount || 0
        } catch { /* skip failed connectors */ }
      }
      setPullMessage(`Pulled ${totalRows} rows. Data is being embedded for AI analysis.`)
      fetchDashboard()
      fetchAnalysis()
    } catch (err) {
      setPullMessage(`Pull failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setPulling(false)
      setTimeout(() => setPullMessage(null), 5000)
    }
  }, [selectedClient, pulling, fetchDashboard, fetchAnalysis])
  const sparklineMock = Array.from(
    {
      length: 10,
    },
    () => ({
      value: Math.random() * 100,
    }),
  )
  const allCards = [
    {
      title: 'Impressions',
      value: '1.2M',
      change: '12.5%',
      trend: 'up',
    },
    {
      title: 'Clicks',
      value: '45.2K',
      change: '8.2%',
      trend: 'up',
    },
    {
      title: 'CTR',
      value: '3.8%',
      change: '1.1%',
      trend: 'down',
    },
    {
      title: 'Avg Position',
      value: '12.4',
      change: '2.1',
      trend: 'up',
    },
    {
      title: 'Sessions',
      value: '38.9K',
      change: '15.4%',
      trend: 'up',
    },
    {
      title: 'Conversions',
      value: '1,240',
      change: '4.3%',
      trend: 'up',
    },
    {
      title: 'ROAS',
      value: '4.2x',
      change: '0.8x',
      trend: 'down',
    },
  ]
  // Use real data from API if available, otherwise fall back to mock
  const effectiveCards = dashData?.metrics?.length
    ? dashData.metrics.map((m) => ({
        title: m.title,
        value: m.value,
        change: m.change,
        trend: m.trend,
      }))
    : allCards
  const effectiveTraffic = dashData?.trafficData?.length ? dashData.trafficData : trafficData
  const effectiveChannels = dashData?.channelData?.length ? dashData.channelData : channelData

  const visibleCards = effectiveCards.filter((c) => !hiddenCards.includes(c.title))
  return (
    <div className="flex-1 overflow-y-auto bg-background">
      {/* Top Bar */}
      <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Button
              variant="outline"
              className="gap-2 bg-background shadow-sm border-border/60 hover:bg-accent/50"
              onClick={() => setClientDropdownOpen(!clientDropdownOpen)}
            >
              {selectedClient && (
                <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                  {selectedClient.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="font-medium">{selectedClient?.name || 'Select client'}</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground ml-2" />
            </Button>
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
                        onClick={() => { setSelectedClient(client); setClientDropdownOpen(false); }}
                        className={cn(
                          'w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2',
                          selectedClient?.id === client.id && 'bg-accent'
                        )}
                      >
                        <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                          {client.name.slice(0, 1).toUpperCase()}
                        </div>
                        <span>{client.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
          {pullMessage && (
            <span className="text-xs text-muted-foreground bg-accent/50 px-3 py-1 rounded-full">{pullMessage}</span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              className="gap-2 shadow-sm rounded-full px-4"
              onClick={() => setIsInsightsOpen(true)}
            >
              <Sparkles className="w-4 h-4" />
              Sulu
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-background shadow-sm rounded-full px-4 border-border/60 hover:bg-accent/50"
              onClick={() => router.push('/reports')}
            >
              <Hammer className="w-4 h-4 text-muted-foreground" />
              Build Report
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-background shadow-sm rounded-full px-4 border-border/60 hover:bg-accent/50"
              onClick={handlePullData}
              disabled={pulling || !selectedClient}
            >
              <RefreshCw className={cn('w-4 h-4 text-muted-foreground', pulling && 'animate-spin')} />
              {pulling ? 'Pulling...' : 'Pull Latest Data'}
            </Button>
          </div>

          <div className="h-6 w-px bg-border mx-2"></div>

          <DateFilterBar />
        </div>
      </header>

      <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
        {/* Tab Bar Header */}
        <div className="border-b border-border/60 mb-8">
          <div className="flex items-center gap-8">
            <button
              onClick={() => setActiveTab('stream')}
              className={`pb-4 flex items-center gap-2 text-sm transition-colors relative ${activeTab === 'stream' ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Data Stream
              {activeTab === 'stream' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`pb-4 flex items-center gap-2 text-sm transition-colors relative ${activeTab === 'import' ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Data Imports
            </button>
          </div>
        </div>

        {activeTab === 'stream' ? (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Data Stream
              </h1>
              <p className="text-muted-foreground mt-1">
                Real-time metrics and data management.
              </p>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
              {visibleCards.map((card) => (
                <StatCard
                  key={card.title}
                  title={card.title}
                  value={card.value}
                  change={card.change}
                  trend={card.trend}
                  sparklineData={sparklineMock}
                  onRemove={() =>
                    setHiddenCards((prev) => [...prev, card.title])
                  }
                />
              ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 shadow-sm border-border/50 group/chart relative">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base font-semibold text-foreground">
                    Traffic & Conversions Trend
                  </CardTitle>
                  <div className="flex items-center gap-1 opacity-0 group-hover/chart:opacity-100 transition-opacity">
                    <button
                      className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      title="Copy to clipboard"
                    >
                      <ClipboardCopy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      title="Download chart"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title="Remove from dashboard"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={effectiveTraffic}
                        margin={{
                          top: 5,
                          right: 20,
                          bottom: 5,
                          left: 0,
                        }}
                      >
                        <defs>
                          <linearGradient
                            id="colorSessions"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#3B82F6"
                              stopOpacity={0.15}
                            />
                            <stop
                              offset="95%"
                              stopColor="#3B82F6"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="colorConversions"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#E8450A"
                              stopOpacity={0.15}
                            />
                            <stop
                              offset="95%"
                              stopColor="#E8450A"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#E2E8F0"
                          vertical={false}
                          opacity={0.5}
                        />
                        <XAxis
                          dataKey="date"
                          stroke="#94A3B8"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          dy={10}
                        />
                        <YAxis
                          yAxisId="left"
                          stroke="#94A3B8"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `${value / 1000}k`}
                          dx={-10}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          stroke="#94A3B8"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          dx={10}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderColor: '#E2E8F0',
                            borderRadius: '12px',
                            boxShadow:
                              '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                            padding: '12px 16px',
                          }}
                          itemStyle={{
                            color: '#0F172A',
                            fontWeight: 600,
                            fontSize: '14px',
                          }}
                          labelStyle={{
                            color: '#64748B',
                            marginBottom: '8px',
                            fontSize: '12px',
                            fontWeight: 500,
                          }}
                          cursor={{
                            stroke: '#94A3B8',
                            strokeWidth: 1,
                            strokeDasharray: '4 4',
                          }}
                        />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="sessions"
                          stroke="#3B82F6"
                          fillOpacity={1}
                          fill="url(#colorSessions)"
                          strokeWidth={3}
                          activeDot={{
                            r: 6,
                            strokeWidth: 0,
                            fill: '#3B82F6',
                          }}
                        />
                        <Area
                          yAxisId="right"
                          type="monotone"
                          dataKey="conversions"
                          stroke="#E8450A"
                          fillOpacity={1}
                          fill="url(#colorConversions)"
                          strokeWidth={3}
                          activeDot={{
                            r: 6,
                            strokeWidth: 0,
                            fill: '#E8450A',
                          }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/50 group/pie relative">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base font-semibold text-foreground">
                    Channel Breakdown
                  </CardTitle>
                  <div className="flex items-center gap-1 opacity-0 group-hover/pie:opacity-100 transition-opacity">
                    <button
                      className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      title="Copy to clipboard"
                    >
                      <ClipboardCopy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      title="Download chart"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title="Remove from dashboard"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] mt-4 flex flex-col items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={effectiveChannels}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {effectiveChannels.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderColor: '#E2E8F0',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          }}
                          itemStyle={{
                            color: '#1E293B',
                            fontWeight: 500,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                      <span className="text-3xl font-mono font-bold text-foreground">
                        1.2K
                      </span>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">
                        Total
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Data Trends — Strategy Agent Analysis */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Data Trends
                </h3>
                <Badge
                  variant="outline"
                  className="ml-2 text-emerald-600 border-emerald-500/30 bg-emerald-50 shadow-none gap-1 text-[10px] h-5 px-1.5 font-medium"
                >
                  <Sparkles className="w-3 h-3" /> Strategy Agent
                </Badge>
                <span className="ml-auto text-xs text-muted-foreground font-medium">
                  Based on Last 30 Days • RAG + Intelligence
                </span>
              </div>

              <Card className="shadow-sm border-border/50 overflow-hidden group/trends relative">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border-b border-border/50 px-5 py-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    Holistic Period Analysis — {selectedClient?.name || 'Client'}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 opacity-0 group-hover/trends:opacity-100 transition-opacity">
                      <button
                        className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        title="Copy to clipboard"
                      >
                        <ClipboardCopy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Remove from dashboard"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-muted-foreground border-border/60 shadow-none text-[10px] h-5 px-1.5 font-medium bg-background"
                    >
                      {analysisData?.lastPullAt ? `Updated ${timeAgo(new Date(analysisData.lastPullAt))}` : 'Not analyzed yet'}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-6 space-y-6">
                  {analyzing && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <p className="text-sm">Running Strategy Agent analysis...</p>
                      <p className="text-xs">This may take 30–60 seconds</p>
                    </div>
                  )}

                  {!analyzing && analysisData && (
                    <StrategyAgentAnalysis
                      narrative={analysisData.narrative}
                      keyObservations={analysisData.keyObservations}
                      recommendedActions={analysisData.recommendedActions}
                      onRefine={fetchAnalysis}
                      onExport={() => router.push('/reports')}
                    />
                  )}

                  {!analyzing && !analysisData && (
                    <div className="text-center py-8 text-muted-foreground space-y-4">
                      <div>
                        <p className="text-sm">No analysis available yet.</p>
                        <p className="text-xs mt-1">Pull data first, then analysis will auto-generate.</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full gap-2 shadow-sm"
                        onClick={fetchAnalysis}
                        disabled={analyzing}
                      >
                        <Sparkles className="w-4 h-4" /> Generate Analysis
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Potential Correlations */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Potential Correlations
                </h3>
              </div>
              <div className="space-y-3">
                {trendsData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No trends available yet.</p>
                    <p className="text-xs mt-1">Trends will appear here once ingested.</p>
                  </div>
                ) : (
                  trendsData.slice(0, 3).map((trend, idx) => (
                    <Card key={trend.id} className={`shadow-sm border-border/50 overflow-hidden group/corr${idx} relative`}>
                      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                            trend.category === 'seo' ? 'bg-blue-100 text-blue-600' :
                            trend.category === 'geo_ai_visibility' ? 'bg-purple-100 text-purple-600' :
                            trend.category === 'paid_media' ? 'bg-orange-100 text-orange-600' :
                            'bg-green-100 text-green-600'
                          }`}>
                            {trend.source?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`${
                                  trend.category === 'seo' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                  trend.category === 'geo_ai_visibility' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                                  trend.category === 'paid_media' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                  'bg-green-50 text-green-600 border-green-200'
                                } shadow-none font-medium text-[10px] h-5 px-1.5`}
                              >
                                {trend.category || 'Research'}
                              </Badge>
                              <span className="text-xs text-muted-foreground font-medium">
                                {trend.publishedAt ? timeAgo(new Date(trend.publishedAt)) : 'Unknown'}
                              </span>
                            </div>
                            <h4 className="text-sm font-medium text-foreground">
                              {trend.title}
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {trend.summary}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className={`flex items-center gap-1 opacity-0 group-hover/corr${idx}:opacity-100 transition-opacity`}>
                            <button
                              className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                              title="Copy to clipboard"
                            >
                              <ClipboardCopy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                              title="Download"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                              title="Remove from dashboard"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <CorrelateButton
                            clientId={selectedClient?.id || ''}
                            content={`# Trend: ${trend.title}\n\nCategory: ${trend.category}\nSource: ${trend.source}\nPublished: ${trend.publishedAt}\n\n${trend.summary}`}
                            contentType="strategy"
                            metadata={{
                              trendId: trend.id,
                              trendTitle: trend.title,
                              trendCategory: trend.category,
                              trendSource: trend.source,
                              analysisType: 'trend_correlation',
                            }}
                            trendId={trend.id}
                            label="Correlate"
                            size="sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full shrink-0 gap-2 shadow-sm"
                            onClick={() => {
                              setAnalyzeModalTrend(trend)
                              setAnalysisResult(null)
                              setAnalysisClientId(selectedClient?.id || '')
                            }}
                          >
                            <Link2 className="w-4 h-4" /> Analyze Impact
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <DataImportView />
        )}
      </div>

      {/* Modals */}
      <AIInsightsModal
        isOpen={isInsightsOpen}
        onClose={() => setIsInsightsOpen(false)}
      />

      {/* Analyze Impact Modal */}
      <Dialog open={!!analyzeModalTrend} onOpenChange={(open) => { if (!open) setAnalyzeModalTrend(null); }}>
        {analyzeModalTrend && (
          <>
            <DialogClose onClose={() => setAnalyzeModalTrend(null)} />
            <DialogHeader>
              <Badge variant="outline" className={`text-[9px] h-4 px-1 font-medium w-fit mb-2 ${
                analyzeModalTrend.category === 'seo' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                analyzeModalTrend.category === 'geo_ai_visibility' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                analyzeModalTrend.category === 'paid_media' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                'bg-green-50 text-green-600 border-green-200'
              }`}>
                {analyzeModalTrend.category || 'Research'}
              </Badge>
              <DialogTitle>{analyzeModalTrend.title}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">{analyzeModalTrend.source} · {timeAgo(new Date(analyzeModalTrend.publishedAt))}</p>
            </DialogHeader>

            <DialogBody>
              {!analysisResult && !analyzingTrend && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{analyzeModalTrend.summary}</p>
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
                      onClick={() => handleAnalyzeTrend(analyzeModalTrend.id)}
                      disabled={analyzingTrend || !analysisClientId}
                    >
                      <Sparkles className="w-4 h-4" /> Run Analysis
                    </Button>
                  </div>
                </div>
              )}

              {analyzingTrend && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <p className="text-sm">Running Strategy Agent analysis...</p>
                  <p className="text-xs">This may take 30–60 seconds</p>
                </div>
              )}

              {analysisResult && !analyzingTrend && (
                <div className="prose-sm">
                  <SuluMarkdown content={analysisResult} />
                </div>
              )}
            </DialogBody>

            {analysisResult && !analyzingTrend && (
              <DialogFooter>
                <Button variant="ghost" size="sm" onClick={() => setAnalysisResult(null)}>
                  Re-run
                </Button>
                <CorrelateButton
                  clientId={analysisClientId}
                  content={`# Trend Impact Analysis: ${analyzeModalTrend.title}\n\nTrend URL: ${analyzeModalTrend.url || ''}\nCategory: ${analyzeModalTrend.category}\nSource: ${analyzeModalTrend.source}\n\n${analysisResult}`}
                  contentType="strategy"
                  metadata={{
                    trendId: analyzeModalTrend.id,
                    trendTitle: analyzeModalTrend.title,
                    trendCategory: analyzeModalTrend.category,
                    trendUrl: analyzeModalTrend.url,
                    analysisType: 'trend_impact',
                  }}
                  trendId={analyzeModalTrend.id}
                  label="Correlate"
                  size="sm"
                />
                <Button variant="outline" size="sm" onClick={() => setAnalyzeModalTrend(null)}>
                  Close
                </Button>
              </DialogFooter>
            )}
          </>
        )}
      </Dialog>
    </div>
  )
}

