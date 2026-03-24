import cron from 'node-cron';
import { prisma } from './prisma';
import { ingestAllFeeds } from './rss-ingest';
import { generateDigest } from './digest';
import { querySulu } from './agents';

let rssJob: any = null;
let digestJob: any = null;
let analysisJob: any = null;

/**
 * Start the scheduled jobs:
 * 1. RSS ingestion — runs every 4 hours
 * 2. Digest generation — runs based on each org's schedule
 */
export function startScheduler(): void {
  // RSS ingestion: every 4 hours at minute 0
  rssJob = cron.schedule('0 */4 * * *', async () => {
    console.log('[scheduler] Running RSS ingestion...');
    try {
      const orgs = await prisma.organization.findMany({ select: { id: true } });
      for (const org of orgs) {
        try {
          const result = await ingestAllFeeds(org.id);
          console.log(`[scheduler] Org ${org.id}: ${result.newItems} new items ingested`);
        } catch (err) {
          console.error(`[scheduler] RSS ingest failed for org ${org.id}:`, err);
        }
      }
    } catch (err) {
      console.error('[scheduler] RSS ingestion job failed:', err);
    }
  });

  // Digest check: runs every hour, checks if any org's digest is due
  digestJob = cron.schedule('0 * * * *', async () => {
    console.log('[scheduler] Checking digest schedules...');
    try {
      const schedules = await prisma.digestSchedule.findMany({
        where: { enabled: true },
      });

      const now = new Date();

      for (const schedule of schedules) {
        if (!isDigestDue(schedule, now)) continue;

        console.log(`[scheduler] Running ${schedule.frequency} digest for org ${schedule.orgId}`);
        try {
          const result = await generateDigest(schedule.orgId, schedule.frequency);
          console.log(`[scheduler] Digest generated: ${result.trendCount} trends synthesized`);
        } catch (err) {
          console.error(`[scheduler] Digest failed for org ${schedule.orgId}:`, err);
        }
      }
    } catch (err) {
      console.error('[scheduler] Digest check job failed:', err);
    }
  });

  // Dashboard analysis: runs daily at 7am UTC for all clients
  analysisJob = cron.schedule('0 7 * * *', async () => {
    console.log('[scheduler] Running daily dashboard analysis generation...');
    try {
      const clients = await prisma.client.findMany({
        select: { id: true, name: true, industry: true, domains: true, orgId: true },
      });

      for (const client of clients) {
        try {
          await generateDashboardAnalysis(client.id, client.orgId, client.name, client.industry, client.domains);
          console.log(`[scheduler] Analysis generated for client ${client.name}`);
        } catch (err) {
          console.error(`[scheduler] Analysis failed for client ${client.name}:`, err);
        }
      }
    } catch (err) {
      console.error('[scheduler] Daily analysis job failed:', err);
    }
  });

  console.log('✓ Scheduler started (RSS every 4h, digest check every 1h, analysis daily at 7am)');
}

/**
 * Check if a digest is due based on its schedule.
 */
function isDigestDue(
  schedule: { frequency: string; hour: number; timezone: string; lastRunAt: Date | null },
  now: Date,
): boolean {
  // Simple hour check (timezone-aware would need more logic, using UTC offset for now)
  const currentHour = now.getUTCHours();
  // Allow 1 hour window for the scheduled hour
  if (Math.abs(currentHour - schedule.hour) > 1 && Math.abs(currentHour - schedule.hour) < 23) {
    return false;
  }

  if (!schedule.lastRunAt) return true;

  const msSinceLastRun = now.getTime() - schedule.lastRunAt.getTime();
  const hoursSinceLastRun = msSinceLastRun / (1000 * 60 * 60);

  switch (schedule.frequency) {
    case 'daily':
      return hoursSinceLastRun >= 20; // ~daily with some tolerance
    case 'weekly':
      return hoursSinceLastRun >= 160 && now.getDay() === 1; // Mondays
    case 'monthly':
      return hoursSinceLastRun >= 672 && now.getDate() === 1; // 1st of month
    default:
      return false;
  }
}

/**
 * Generate dashboard analysis for a single client
 */
async function generateDashboardAnalysis(
  clientId: string,
  orgId: string,
  clientName: string,
  industry: string | null,
  domains: string[] | null
): Promise<void> {
  // Get recent dashboard metrics
  const recentPulls = await prisma.dataPull.findMany({
    where: { clientId, status: 'success' },
    orderBy: { completedAt: 'desc' },
    take: 2,
  });

  if (recentPulls.length === 0) {
    console.log(`[scheduler] No data available for client ${clientName}, skipping analysis`);
    return;
  }

  const currentPull = recentPulls[0];
  const currentData = currentPull.resultJson as { rows?: Array<Record<string, unknown>> } | null;
  const currentRows = currentData?.rows || [];

  // Aggregate key metrics
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
  const prompt = `Analyze the following 30-day performance data for "${clientName}" (${industry || 'general industry'}, domains: ${domains?.join(', ') || 'unknown'}).

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
1. [action] [Urgent/High/Medium]
2. [action] [Urgent/High/Medium]
3. [action] [Urgent/High/Medium]
4. [action] [Urgent/High/Medium]

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
  const parsed = parseStrategyAnalysis(rawAnalysis, clientName);

  // Save the analysis to the database
  await prisma.dashboardAnalysis.create({
    data: {
      clientId,
      narrativeJson: parsed.narrative,
      keyObservationsJson: parsed.keyObservations,
      recommendedActionsJson: parsed.recommendedActions,
      dataPullId: currentPull.id,
    },
  });
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

function parseStrategyAnalysis(rawText: string, clientName: string) {
  const fallback = {
    narrative: [
      `Analysis for ${clientName} is being generated.`,
      'Please check back shortly for detailed insights.'
    ],
    keyObservations: [
      { type: 'opportunity' as const, headline: 'Data Analysis in Progress', description: 'Analyzing performance data.' },
      { type: 'risk' as const, headline: 'Pending Analysis', description: 'Risk assessment pending.' },
      { type: 'emerging' as const, headline: 'Trend Detection', description: 'Identifying patterns.' }
    ],
    recommendedActions: [
      { priority: 'high' as const, action: 'Wait for analysis to complete' }
    ]
  };

  if (!rawText || rawText.trim().length === 0) return fallback;

  try {
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

    const keyObservations: Array<{ type: 'opportunity' | 'risk' | 'emerging'; headline: string; description: string }> = [];
    const obsMatch = rawText.match(/\*\*Key Observations\*\*[\s\S]*?(?=\*\*Recommended Focus\*\*|$)/i);
    if (obsMatch) {
      const lines = obsMatch[0].split('\n').filter(l => l.trim().length > 0);
      for (const line of lines) {
        const oppMatch = line.match(/\*\*Opportunity\*\*\s*[—-]\s*(.+?):\s*(.+)/i);
        const riskMatch = line.match(/\*\*Risk\*\*\s*[—-]\s*(.+?):\s*(.+)/i);
        const emergMatch = line.match(/\*\*Emerging\*\*\s*[—-]\s*(.+?):\s*(.+)/i);
        
        if (oppMatch) keyObservations.push({ type: 'opportunity', headline: oppMatch[1].trim(), description: oppMatch[2].trim() });
        else if (riskMatch) keyObservations.push({ type: 'risk', headline: riskMatch[1].trim(), description: riskMatch[2].trim() });
        else if (emergMatch) keyObservations.push({ type: 'emerging', headline: emergMatch[1].trim(), description: emergMatch[2].trim() });
      }
    }

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

export function stopScheduler(): void {
  if (rssJob) {
    rssJob.stop();
    rssJob = null;
  }
  if (digestJob) {
    digestJob.stop();
    digestJob = null;
  }
  if (analysisJob) {
    analysisJob.stop();
    analysisJob = null;
  }
  console.log('✓ Scheduler stopped');
}
