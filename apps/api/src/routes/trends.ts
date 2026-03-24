import { Router, Request, Response } from 'express';
import { TrendCategory } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { sendSuccess, sendError } from '../lib/response';
import { prisma } from '../lib/prisma';
import { ingestAllFeeds } from '../lib/rss-ingest';
import { searchAndStoreTrends } from '../lib/brave-search';
import { generateDigest } from '../lib/digest';
import { querySulu } from '../lib/agents';

const router = Router();
router.use(authenticate);

const VALID_CATEGORIES: TrendCategory[] = ['seo', 'geo_ai_visibility', 'paid_media', 'research'];

// GET /api/trends — list trend items (paginated, filterable)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.orgId;
    const category = req.query.category as TrendCategory | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const where: Record<string, unknown> = { orgId };
    if (category && VALID_CATEGORIES.includes(category)) {
      where.category = category;
    }

    const [items, total] = await Promise.all([
      prisma.trendItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.trendItem.count({ where }),
    ]);

    sendSuccess(res, { items, total, limit, offset });
  } catch (error) {
    console.error('List trends error:', error);
    sendError(res, 'Failed to list trends', 500);
  }
});

// POST /api/trends/ingest — trigger RSS ingestion
router.post('/ingest', async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.orgId;
    const category = req.body.category as TrendCategory | undefined;

    const result = await ingestAllFeeds(orgId, category);
    sendSuccess(res, result);
  } catch (error) {
    console.error('RSS ingest error:', error);
    sendError(res, 'Failed to ingest RSS feeds', 500);
  }
});

// POST /api/trends/search — on-demand Brave Search for trend signals
router.post('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.orgId;
    const { query, category } = req.body as { query?: string; category?: TrendCategory };

    if (!query || !query.trim()) {
      sendError(res, 'query is required', 400);
      return;
    }

    const cat = category && VALID_CATEGORIES.includes(category) ? category : 'research';
    const result = await searchAndStoreTrends(orgId, query.trim(), cat, 10);
    sendSuccess(res, result);
  } catch (error) {
    console.error('Brave search error:', error);
    sendError(res, 'Failed to search trends', 500);
  }
});

// POST /api/trends/digest — generate an AI digest from recent trends
router.post('/digest', async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.orgId;
    const frequency = (req.body.frequency || 'daily') as 'daily' | 'weekly' | 'monthly';

    const result = await generateDigest(orgId, frequency);
    sendSuccess(res, result);
  } catch (error) {
    console.error('Digest generation error:', error);
    sendError(res, 'Failed to generate digest', 500);
  }
});

// POST /api/trends/:trendId/analyze — analyze a trend's impact on a client using Strategy Agent
router.post('/:trendId/analyze', async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.orgId;
    const trendId = req.params.trendId as string;
    const { clientId } = req.body as { clientId?: string };

    if (!clientId) {
      sendError(res, 'clientId is required', 400);
      return;
    }

    const trend = await prisma.trendItem.findFirst({ where: { id: trendId, orgId } });
    if (!trend) {
      sendError(res, 'Trend not found', 404);
      return;
    }

    const client = await prisma.client.findFirst({ where: { id: clientId, orgId } });
    if (!client) {
      sendError(res, 'Client not found', 404);
      return;
    }

    const prompt = `Analyze the impact of this industry trend on the client "${client.name}" (${client.industry || 'general industry'}, domains: ${client.domains.join(', ') || 'unknown'}).

Trend: ${trend.title}
Category: ${trend.category}
Summary: ${trend.summary}

Provide:
1. **Impact Assessment** — How does this trend affect this specific client? (severity: low/medium/high)
2. **At-Risk Areas** — Which aspects of their digital presence are most affected?
3. **Recommended Actions** — 3-5 specific, actionable steps the client should take
4. **Timeline** — How urgent is this? What's the expected timeline for impact?

Be specific to this client's situation. Use data and context from their history if available.`;

    const response = await querySulu({
      clientId,
      orgId,
      query: prompt,
      agentType: 'strategy',
    });

    const strategyAgent = response.agents.find((a) => a.agentType === 'strategy');
    const analysis = strategyAgent?.response || 'Impact analysis unavailable.';

    sendSuccess(res, {
      trendId: trend.id,
      trendTitle: trend.title,
      clientId: client.id,
      clientName: client.name,
      analysis,
    });
  } catch (error) {
    console.error('Trend analysis error:', error);
    sendError(res, 'Failed to analyze trend impact', 500);
  }
});

// GET /api/trends/schedule — get digest schedule for the org
router.get('/schedule', async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.orgId;

    let schedule = await prisma.digestSchedule.findUnique({ where: { orgId } });
    if (!schedule) {
      // Create default schedule
      schedule = await prisma.digestSchedule.create({
        data: { orgId, frequency: 'daily', hour: 8, timezone: 'America/New_York', enabled: true },
      });
    }

    sendSuccess(res, schedule);
  } catch (error) {
    console.error('Get schedule error:', error);
    sendError(res, 'Failed to get digest schedule', 500);
  }
});

// PATCH /api/trends/schedule — update digest schedule
router.patch('/schedule', async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.orgId;
    const { frequency, hour, timezone, enabled } = req.body as {
      frequency?: 'daily' | 'weekly' | 'monthly';
      hour?: number;
      timezone?: string;
      enabled?: boolean;
    };

    const updateData: Record<string, unknown> = {};
    if (frequency) updateData.frequency = frequency;
    if (hour !== undefined && hour >= 0 && hour <= 23) updateData.hour = hour;
    if (timezone) updateData.timezone = timezone;
    if (enabled !== undefined) updateData.enabled = enabled;

    const schedule = await prisma.digestSchedule.upsert({
      where: { orgId },
      update: updateData,
      create: {
        orgId,
        frequency: frequency || 'daily',
        hour: hour ?? 8,
        timezone: timezone || 'America/New_York',
        enabled: enabled ?? true,
      },
    });

    sendSuccess(res, schedule);
  } catch (error) {
    console.error('Update schedule error:', error);
    sendError(res, 'Failed to update digest schedule', 500);
  }
});

export default router;
