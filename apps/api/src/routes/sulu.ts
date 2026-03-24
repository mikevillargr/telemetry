import { Router, Request, Response } from 'express';
import { AgentType, AGENT_TYPES } from '@gr-bi/shared';
import { authenticate, requireClientAccess } from '../middleware/auth';
import { sendSuccess, sendError } from '../lib/response';
import { querySulu } from '../lib/agents';
import { writeAuditLog } from '../lib/audit';

const router = Router();
router.use(authenticate);

// POST /api/sulu/:clientId/query — query Sulu AI agent(s)
router.post('/:clientId/query', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId as string;
    const query = req.body.query as string | undefined;
    const agentType = req.body.agentType as AgentType | undefined;
    const conversationHistory = req.body.conversationHistory as Array<{ role: 'user' | 'assistant'; content: string }> | undefined;
    const dateFrom = req.body.dateFrom as string | undefined;
    const dateTo = req.body.dateTo as string | undefined;

    if (!query || typeof query !== 'string') {
      sendError(res, 'query is required');
      return;
    }

    if (agentType && !AGENT_TYPES.includes(agentType as typeof AGENT_TYPES[number])) {
      sendError(res, `Invalid agentType. Must be one of: ${AGENT_TYPES.join(', ')}`);
      return;
    }

    const result = await querySulu({
      clientId,
      orgId: req.user!.orgId,
      query,
      agentType,
      conversationHistory,
      dateFrom,
      dateTo,
    });

    await writeAuditLog({
      orgId: req.user!.orgId,
      userId: req.user!.userId,
      action: 'sulu.query',
      entityType: 'sulu_query',
      entityId: clientId,
      details: { agentType, queryLength: query.length },
    });

    sendSuccess(res, result);
  } catch (error) {
    console.error('Sulu query error:', error);
    sendError(res, error instanceof Error ? error.message : 'Sulu query failed', 500);
  }
});

// GET /api/sulu/agents — list available agent types and their configs for the user's org
router.get('/agents', async (req: Request, res: Response): Promise<void> => {
  try {
    const { prisma } = await import('../lib/prisma');
    const configs = await prisma.agentConfig.findMany({
      where: { orgId: req.user!.orgId },
      select: {
        agentType: true,
        model: true,
        systemPrompt: true,
        updatedAt: true,
      },
    });

    sendSuccess(res, configs);
  } catch (error) {
    console.error('List agents error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

export default router;
