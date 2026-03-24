import { Router, Request, Response } from 'express';
import { authenticate, requireClientAccess } from '../middleware/auth';
import { sendSuccess, sendError } from '../lib/response';
import { prisma } from '../lib/prisma';
import { querySulu } from '../lib/agents';

const router = Router();
router.use(authenticate);

interface MetricSummary {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  sparkline: number[];
}

interface DashboardData {
  metrics: MetricSummary[];
  trafficData: Array<{ date: string; sessions: number; conversions: number }>;
  channelData: Array<{ name: string; value: number }>;
  lastPullAt: string | null;
}

// GET /api/dashboard/:clientId — aggregate dashboard metrics from data pulls
router.get('/:clientId', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId as string;

    // Get the two most recent successful data pulls (current + previous for comparison)
    const recentPulls = await prisma.dataPull.findMany({
      where: { clientId, status: 'success' },
      orderBy: { completedAt: 'desc' },
      take: 2,
    });

    if (recentPulls.length === 0) {
      // No data yet — return empty dashboard
      sendSuccess(res, {
        metrics: [],
        trafficData: [],
        channelData: [],
        lastPullAt: null,
      } as DashboardData);
      return;
    }

    const currentPull = recentPulls[0];
    const previousPull = recentPulls.length > 1 ? recentPulls[1] : null;

    const currentData = currentPull.resultJson as { rows?: Array<Record<string, unknown>> } | null;
    const previousData = previousPull?.resultJson as { rows?: Array<Record<string, unknown>> } | null;

    const currentRows = currentData?.rows || [];
    const previousRows = previousData?.rows || [];

    // Aggregate metrics from current rows
    const currentAgg = aggregateRows(currentRows);
    const previousAgg = aggregateRows(previousRows);

    // Build metric cards
    const metrics: MetricSummary[] = [];

    const metricDefs: Array<{ key: string; title: string; format: (v: number) => string }> = [
      { key: 'impressions', title: 'Impressions', format: formatLargeNumber },
      { key: 'clicks', title: 'Clicks', format: formatLargeNumber },
      { key: 'sessions', title: 'Sessions', format: formatLargeNumber },
      { key: 'conversions', title: 'Conversions', format: formatLargeNumber },
      { key: 'ctr', title: 'CTR', format: (v) => `${(v * 100).toFixed(1)}%` },
      { key: 'position', title: 'Avg Position', format: (v) => v.toFixed(1) },
      { key: 'bounceRate', title: 'Bounce Rate', format: (v) => `${(v * 100).toFixed(1)}%` },
    ];

    for (const def of metricDefs) {
      const cur = currentAgg[def.key];
      const prev = previousAgg[def.key];
      if (cur === undefined) continue;

      const change = prev && prev !== 0 ? ((cur - prev) / prev) * 100 : 0;
      const isPositive = def.key === 'bounceRate' || def.key === 'position' ? change < 0 : change > 0;

      // Generate sparkline from daily data
      const sparkline = currentRows
        .slice(0, 10)
        .map((r) => {
          const val = r[def.key];
          return typeof val === 'number' ? val : 0;
        });

      metrics.push({
        title: def.title,
        value: def.format(cur),
        change: `${Math.abs(change).toFixed(1)}%`,
        trend: isPositive ? 'up' : 'down',
        sparkline,
      });
    }

    // Build traffic trend data from rows (by date)
    const trafficData = currentRows
      .filter((r) => r.date && (r.sessions !== undefined || r.clicks !== undefined))
      .slice(0, 30)
      .map((r) => ({
        date: formatDate(r.date as string),
        sessions: (r.sessions as number) || (r.clicks as number) || 0,
        conversions: (r.conversions as number) || (r.goalCompletions as number) || 0,
      }));

    // Build channel breakdown (if channelGroup data exists)
    const channelMap = new Map<string, number>();
    for (const row of currentRows) {
      const channel = (row.channelGroup || row.source || row.medium) as string | undefined;
      if (channel) {
        channelMap.set(channel, (channelMap.get(channel) || 0) + ((row.sessions as number) || 1));
      }
    }
    const channelData = Array.from(channelMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));

    sendSuccess(res, {
      metrics,
      trafficData,
      channelData,
      lastPullAt: currentPull.completedAt?.toISOString() || null,
    } as DashboardData);
  } catch (error) {
    console.error('Dashboard data error:', error);
    sendError(res, 'Failed to load dashboard data', 500);
  }
});

// GET /api/dashboard/:clientId/analysis — get the most recent persisted analysis
router.get('/:clientId/analysis', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId as string;

    // Get the most recent analysis
    const analysis = await prisma.dashboardAnalysis.findFirst({
      where: { clientId },
      orderBy: { generatedAt: 'desc' },
    });

    if (!analysis) {
      sendError(res, 'No analysis available yet', 404);
      return;
    }

    sendSuccess(res, {
      narrative: analysis.narrativeJson as string[],
      keyObservations: analysis.keyObservationsJson as Array<{
        type: 'opportunity' | 'risk' | 'emerging';
        headline: string;
        description: string;
      }>,
      recommendedActions: analysis.recommendedActionsJson as Array<{
        priority: 'urgent' | 'high' | 'medium';
        action: string;
      }>,
      lastPullAt: analysis.generatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Get analysis error:', error);
    sendError(res, 'Failed to retrieve analysis', 500);
  }
});

// POST /api/dashboard/:clientId/analyze — generate Strategy Agent analysis for dashboard
router.post('/:clientId/analyze', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId as string;
    const orgId = req.user!.orgId;

    // Get client info
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, industry: true, domains: true },
    });
    if (!client) {
      sendError(res, 'Client not found', 404);
      return;
    }

    // Get recent dashboard metrics
    const recentPulls = await prisma.dataPull.findMany({
      where: { clientId, status: 'success' },
      orderBy: { completedAt: 'desc' },
      take: 2,
    });

    if (recentPulls.length === 0) {
      sendError(res, 'No data available for analysis. Pull data first.', 400);
      return;
    }

    const currentPull = recentPulls[0];
    const currentData = currentPull.resultJson as { rows?: Array<Record<string, unknown>> } | null;
    const currentRows = currentData?.rows || [];

    // Aggregate key metrics for the prompt
    const agg = aggregateRows(currentRows);
    const metrics = {
      sessions: agg.sessions || 0,
      conversions: agg.conversions || 0,
      ctr: agg.ctr ? (agg.ctr * 100).toFixed(1) + '%' : 'N/A',
      impressions: agg.impressions || 0,
      clicks: agg.clicks || 0,
      bounceRate: agg.bounceRate ? (agg.bounceRate * 100).toFixed(1) + '%' : 'N/A',
      avgPosition: agg.position ? agg.position.toFixed(1) : 'N/A',
    };

    // Build prompt for Strategy Agent
    const prompt = `Analyze the following 30-day performance data for "${client.name}" (${client.industry || 'general industry'}, domains: ${client.domains?.join(', ') || 'unknown'}).

Key Metrics:
- Sessions: ${metrics.sessions}
- Conversions: ${metrics.conversions}
- CTR: ${metrics.ctr}
- Impressions: ${metrics.impressions}
- Clicks: ${metrics.clicks}
- Bounce Rate: ${metrics.bounceRate}
- Avg Position: ${metrics.avgPosition}

Provide a holistic analysis in this exact format:

**Narrative** (2-3 paragraphs):
- Overall growth phase and performance summary
- Key trends and patterns
- Any risks or opportunities

**Key Observations** (3 items):
1. **Opportunity** — [title]: [description]
2. **Risk** — [title]: [description]
3. **Emerging** — [title]: [description]

**Recommended Focus** (4 numbered items):
1. [action] [urgency badge: Urgent/High/Medium]
2. [action] [urgency badge: Urgent/High/Medium]
3. [action] [urgency badge: Urgent/High/Medium]
4. [action] [urgency badge: Urgent/High/Medium]

Use data-driven insights. Reference specific metrics. Be concise but thorough.`;

    const response = await querySulu({
      clientId,
      orgId,
      query: prompt,
      agentType: 'strategy',
    });

    const strategyAgent = response.agents.find((a) => a.agentType === 'strategy');
    const rawAnalysis = strategyAgent?.response || '';

    // Parse the Sulu response into structured format
    const parsed = parseStrategyAnalysis(rawAnalysis, client.name);

    // Save the analysis to the database
    const savedAnalysis = await prisma.dashboardAnalysis.create({
      data: {
        clientId,
        narrativeJson: parsed.narrative,
        keyObservationsJson: parsed.keyObservations,
        recommendedActionsJson: parsed.recommendedActions,
        dataPullId: currentPull.id,
      },
    });

    sendSuccess(res, {
      narrative: parsed.narrative,
      keyObservations: parsed.keyObservations,
      recommendedActions: parsed.recommendedActions,
      lastPullAt: savedAnalysis.generatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Dashboard analysis error:', error);
    sendError(res, 'Failed to generate analysis', 500);
  }
});

function parseStrategyAnalysis(rawText: string, clientName: string) {
  // Default fallback structure
  const fallback = {
    narrative: [
      `Analysis for ${clientName} is being generated. This may take a moment.`,
      'Please check back shortly for detailed insights and recommendations.'
    ],
    keyObservations: [
      {
        type: 'opportunity' as const,
        headline: 'Data Analysis in Progress',
        description: 'Strategy Agent is analyzing your performance data to identify growth opportunities.'
      },
      {
        type: 'risk' as const,
        headline: 'Pending Analysis',
        description: 'Risk assessment will be available once the analysis is complete.'
      },
      {
        type: 'emerging' as const,
        headline: 'Trend Detection',
        description: 'Emerging patterns and trends are being identified from your data.'
      }
    ],
    recommendedActions: [
      {
        priority: 'high' as const,
        action: 'Wait for analysis to complete'
      }
    ]
  };

  if (!rawText || rawText.trim().length === 0) {
    return fallback;
  }

  try {
    // Parse narrative paragraphs (everything before **Key Observations**)
    const narrative: string[] = [];
    const narrativeMatch = rawText.match(/\*\*Narrative\*\*[\s\S]*?(?=\*\*Key Observations\*\*|$)/i);
    if (narrativeMatch) {
      const paragraphs = narrativeMatch[0]
        .replace(/\*\*Narrative\*\*/i, '')
        .split('\n\n')
        .map(p => p.trim())
        .filter(p => p.length > 0 && !p.startsWith('-') && !p.startsWith('*'));
      narrative.push(...paragraphs);
    }

    // Parse key observations
    const keyObservations: Array<{ type: 'opportunity' | 'risk' | 'emerging'; headline: string; description: string }> = [];
    const obsMatch = rawText.match(/\*\*Key Observations\*\*[\s\S]*?(?=\*\*Recommended Focus\*\*|$)/i);
    if (obsMatch) {
      const lines = obsMatch[0].split('\n').filter(l => l.trim().length > 0);
      for (const line of lines) {
        const oppMatch = line.match(/\*\*Opportunity\*\*\s*[—-]\s*(.+?):\s*(.+)/i);
        const riskMatch = line.match(/\*\*Risk\*\*\s*[—-]\s*(.+?):\s*(.+)/i);
        const emergMatch = line.match(/\*\*Emerging\*\*\s*[—-]\s*(.+?):\s*(.+)/i);
        
        if (oppMatch) {
          keyObservations.push({ type: 'opportunity', headline: oppMatch[1].trim(), description: oppMatch[2].trim() });
        } else if (riskMatch) {
          keyObservations.push({ type: 'risk', headline: riskMatch[1].trim(), description: riskMatch[2].trim() });
        } else if (emergMatch) {
          keyObservations.push({ type: 'emerging', headline: emergMatch[1].trim(), description: emergMatch[2].trim() });
        }
      }
    }

    // Parse recommended actions
    const recommendedActions: Array<{ priority: 'urgent' | 'high' | 'medium'; action: string }> = [];
    const actionsMatch = rawText.match(/\*\*Recommended Focus\*\*[\s\S]*$/i);
    if (actionsMatch) {
      const lines = actionsMatch[0].split('\n').filter(l => l.trim().length > 0);
      for (const line of lines) {
        const actionMatch = line.match(/^\d+\.\s*(.+?)\s*\[(Urgent|High|Medium)\]/i);
        if (actionMatch) {
          recommendedActions.push({
            priority: actionMatch[2].toLowerCase() as 'urgent' | 'high' | 'medium',
            action: actionMatch[1].trim()
          });
        }
      }
    }

    // Return parsed data or fallback
    return {
      narrative: narrative.length > 0 ? narrative : fallback.narrative,
      keyObservations: keyObservations.length > 0 ? keyObservations : fallback.keyObservations,
      recommendedActions: recommendedActions.length > 0 ? recommendedActions : fallback.recommendedActions
    };
  } catch (error) {
    console.error('Error parsing strategy analysis:', error);
    return fallback;
  }
}

function aggregateRows(rows: Array<Record<string, unknown>>): Record<string, number> {
  const agg: Record<string, number> = {};
  const counts: Record<string, number> = {};

  for (const row of rows) {
    for (const [key, val] of Object.entries(row)) {
      if (typeof val === 'number' && key !== 'date') {
        agg[key] = (agg[key] || 0) + val;
        counts[key] = (counts[key] || 0) + 1;
      }
    }
  }

  // Average-based metrics
  const avgKeys = ['ctr', 'position', 'bounceRate', 'avgSessionDuration'];
  for (const key of avgKeys) {
    if (agg[key] && counts[key]) {
      agg[key] = agg[key] / counts[key];
    }
  }

  return agg;
}

function formatLargeNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDate(d: string): string {
  try {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return d;
  }
}

export default router;
