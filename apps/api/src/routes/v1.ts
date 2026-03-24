import { Router, Request, Response } from 'express';
import { authenticateApiKey, requireApiKeyClientAccess } from '../middleware/api-key-auth';
import { sendSuccess, sendError } from '../lib/response';
import { prisma } from '../lib/prisma';
import { querySulu } from '../lib/agents';

const router = Router();
router.use(authenticateApiKey);

// GET /api/v1/clients/:clientId/metrics — latest metric snapshot
router.get('/clients/:clientId/metrics', requireApiKeyClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;

    // Get latest data pulls by connector type
    const pulls = await prisma.dataPull.findMany({
      where: { clientId, status: 'success' },
      orderBy: { completedAt: 'desc' },
      distinct: ['connectorType'],
      select: {
        connectorType: true,
        rowCount: true,
        completedAt: true,
        dateRangeStart: true,
        dateRangeEnd: true,
      },
    });

    // Get client info
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, domains: true, industry: true },
    });

    if (!client) {
      sendError(res, 'Client not found', 404);
      return;
    }

    // Get RAG doc count
    const ragCount = await prisma.ragDocument.count({ where: { clientId } });

    sendSuccess(res, {
      client,
      dataSources: pulls.map((p) => ({
        connector: p.connectorType,
        rowCount: p.rowCount,
        lastSync: p.completedAt,
        dateRange: { start: p.dateRangeStart, end: p.dateRangeEnd },
      })),
      ragDocuments: ragCount,
    });
  } catch (error) {
    console.error('V1 metrics error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

// GET /api/v1/clients/:clientId/reports — list reports for a client
router.get('/clients/:clientId/reports', requireApiKeyClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const reports = await prisma.report.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        contentJson: true,
        createdByAgent: true,
        createdAt: true,
      },
    });

    sendSuccess(res, {
      reports,
      total: await prisma.report.count({ where: { clientId } }),
    });
  } catch (error) {
    console.error('V1 reports error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

// POST /api/v1/agents/query — query the AI agent system
router.post('/agents/query', async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientId, query, agentType } = req.body;

    if (!clientId || !query) {
      sendError(res, 'clientId and query are required');
      return;
    }

    // Check client scope
    if (req.apiKey!.scopeClientId && req.apiKey!.scopeClientId !== clientId) {
      sendError(res, 'API key does not have access to this client', 403);
      return;
    }

    const result = await querySulu({
      clientId,
      orgId: req.apiKey!.orgId,
      query,
      agentType: agentType || 'strategy',
    });

    sendSuccess(res, {
      query,
      agentType: agentType || 'strategy',
      response: result,
    });
  } catch (error) {
    console.error('V1 agent query error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

// GET /api/v1/trends/digest — latest trends digest
router.get('/trends/digest', async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.apiKey!.orgId;
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);

    // Get recent digests from RAG
    const digests = await prisma.ragDocument.findMany({
      where: {
        contentType: 'trends_digest',
        client: { orgId },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        content: true,
        createdAt: true,
        metadata: true,
      },
    });

    // Get latest trend items
    const trends = await prisma.trendItem.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        url: true,
        category: true,
        source: true,
        summary: true,
        publishedAt: true,
        createdAt: true,
      },
    });

    sendSuccess(res, {
      digests,
      recentTrends: trends,
    });
  } catch (error) {
    console.error('V1 trends digest error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

// GET /api/v1/clients — list all clients accessible by this key
router.get('/clients', async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.apiKey!.orgId;
    const scopeClientId = req.apiKey!.scopeClientId;

    const where = scopeClientId
      ? { id: scopeClientId, orgId }
      : { orgId };

    const clients = await prisma.client.findMany({
      where,
      select: {
        id: true,
        name: true,
        domains: true,
        industry: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    sendSuccess(res, clients);
  } catch (error) {
    console.error('V1 clients error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

export default router;
