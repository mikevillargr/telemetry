import { Router, Request, Response } from 'express';
import { authenticate, requireClientAccess } from '../middleware/auth';
import { sendSuccess, sendError } from '../lib/response';
import { prisma } from '../lib/prisma';
import { writeAuditLog } from '../lib/audit';
import { querySulu } from '../lib/agents';
import { storeChunks } from '../lib/rag';
import { chunkText } from '../lib/chunker';
import { generatePptx } from '../lib/pptx';

const router = Router();
router.use(authenticate);

// GET /api/reports/:clientId — list reports for a client
router.get('/:clientId', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId as string;
    const reports = await prisma.report.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: { client: { select: { name: true } } },
    });

    const mapped = reports.map((r) => {
      const content = r.contentJson as { sections?: unknown[] };
      return {
        id: r.id,
        title: r.title,
        clientName: r.client.name,
        createdByAgent: r.createdByAgent,
        createdAt: r.createdAt,
        sectionCount: Array.isArray(content?.sections) ? content.sections.length : 0,
      };
    });

    sendSuccess(res, mapped);
  } catch (error) {
    console.error('List reports error:', error);
    sendError(res, 'Failed to list reports', 500);
  }
});

// GET /api/reports/:clientId/:reportId — get a single report
router.get('/:clientId/:reportId', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId as string;
    const reportId = req.params.reportId as string;
    const report = await prisma.report.findFirst({
      where: { id: reportId, clientId },
      include: { client: { select: { name: true } } },
    });

    if (!report) {
      sendError(res, 'Report not found', 404);
      return;
    }

    sendSuccess(res, {
      id: report.id,
      title: report.title,
      clientName: report.client.name,
      createdByAgent: report.createdByAgent,
      createdAt: report.createdAt,
      contentJson: report.contentJson,
    });
  } catch (error) {
    console.error('Get report error:', error);
    sendError(res, 'Failed to get report', 500);
  }
});

// POST /api/reports/:clientId — create a report manually (from assembled sections)
router.post('/:clientId', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId as string;
    const { title, sections } = req.body as {
      title?: string;
      sections?: Array<{
        type: string;
        title?: string;
        content: string;
        agentType?: string;
      }>;
    };

    if (!title || typeof title !== 'string') {
      sendError(res, 'title is required');
      return;
    }

    const report = await prisma.report.create({
      data: {
        clientId,
        title,
        contentJson: { sections: sections || [] },
      },
    });

    await writeAuditLog({
      orgId: req.user!.orgId,
      userId: req.user!.userId,
      action: 'report.create',
      entityType: 'report',
      entityId: report.id,
      details: { title, sectionCount: sections?.length || 0 },
    });

    sendSuccess(res, { id: report.id, title: report.title, createdAt: report.createdAt }, 201);
  } catch (error) {
    console.error('Create report error:', error);
    sendError(res, 'Failed to create report', 500);
  }
});

// POST /api/reports/:clientId/generate — AI-generated report via Strategy + Data agents
router.post('/:clientId/generate', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId as string;
    const { title, prompt } = req.body as { title?: string; prompt?: string };

    const reportTitle = title || 'AI-Generated Report';
    const reportPrompt = prompt ||
      'Generate a comprehensive performance report for this client. Include: executive summary, key metrics analysis, channel performance breakdown, strategic recommendations, and next steps. Format with clear sections using markdown headers.';

    // Use Strategy Agent to generate the report content
    const result = await querySulu({
      clientId,
      orgId: req.user!.orgId,
      query: reportPrompt,
      agentType: 'strategy',
    });

    const strategyResponse = result.agents.find((a) => a.agentType === 'strategy');
    if (!strategyResponse) {
      sendError(res, 'Strategy Agent failed to generate report', 500);
      return;
    }

    // Also get data agent for metrics
    const dataResult = await querySulu({
      clientId,
      orgId: req.user!.orgId,
      query: 'Provide a summary of all available metrics and KPIs for this client in the most recent period. Include tables where possible.',
      agentType: 'data',
    });
    const dataResponse = dataResult.agents.find((a) => a.agentType === 'data');

    // Build report sections
    const sections: Array<{ type: string; title: string; content: string; agentType: string }> = [];

    if (dataResponse) {
      sections.push({
        type: 'narrative',
        title: 'Data Summary',
        content: dataResponse.response,
        agentType: 'data',
      });
    }

    sections.push({
      type: 'narrative',
      title: 'Strategy & Analysis',
      content: strategyResponse.response,
      agentType: 'strategy',
    });

    const report = await prisma.report.create({
      data: {
        clientId,
        title: reportTitle,
        createdByAgent: 'strategy',
        contentJson: {
          sections,
          generatedAt: new Date().toISOString(),
          prompt: reportPrompt,
        },
      },
    });

    // Also store in RAG for future retrieval (fire-and-forget)
    const fullText = sections.map((s) => `## ${s.title}\n\n${s.content}`).join('\n\n');
    const chunks = chunkText(fullText, 'report', { reportId: report.id, title: reportTitle });
    storeChunks(clientId, chunks, 'strategy').catch((err: Error) =>
      console.error('RAG ingest for report failed:', err.message),
    );

    await writeAuditLog({
      orgId: req.user!.orgId,
      userId: req.user!.userId,
      action: 'report.generate',
      entityType: 'report',
      entityId: report.id,
      details: { title: reportTitle, sectionCount: sections.length },
    });

    sendSuccess(res, {
      id: report.id,
      title: report.title,
      createdAt: report.createdAt,
      contentJson: report.contentJson,
    }, 201);
  } catch (error) {
    console.error('Generate report error:', error);
    sendError(res, error instanceof Error ? error.message : 'Failed to generate report', 500);
  }
});

// PATCH /api/reports/:clientId/:reportId — update a report (title, add sections)
router.patch('/:clientId/:reportId', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId as string;
    const reportId = req.params.reportId as string;
    const { title, sections } = req.body as {
      title?: string;
      sections?: Array<{ type: string; title?: string; content: string; agentType?: string }>;
    };

    const existing = await prisma.report.findFirst({ where: { id: reportId, clientId } });
    if (!existing) {
      sendError(res, 'Report not found', 404);
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (title) updateData.title = title;
    if (sections) updateData.contentJson = { ...(existing.contentJson as object), sections };

    const report = await prisma.report.update({
      where: { id: reportId },
      data: updateData,
    });

    sendSuccess(res, { id: report.id, title: report.title, contentJson: report.contentJson });
  } catch (error) {
    console.error('Update report error:', error);
    sendError(res, 'Failed to update report', 500);
  }
});

// DELETE /api/reports/:clientId/:reportId — delete a report
router.delete('/:clientId/:reportId', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId as string;
    const reportId = req.params.reportId as string;

    const existing = await prisma.report.findFirst({ where: { id: reportId, clientId } });
    if (!existing) {
      sendError(res, 'Report not found', 404);
      return;
    }

    await prisma.report.delete({ where: { id: reportId } });

    await writeAuditLog({
      orgId: req.user!.orgId,
      userId: req.user!.userId,
      action: 'report.delete',
      entityType: 'report',
      entityId: reportId,
      details: { title: existing.title },
    });

    sendSuccess(res, { deleted: true });
  } catch (error) {
    console.error('Delete report error:', error);
    sendError(res, 'Failed to delete report', 500);
  }
});

// GET /api/reports/:clientId/:reportId/export/pptx — download PPTX
router.get('/:clientId/:reportId/export/pptx', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId as string;
    const reportId = req.params.reportId as string;

    const report = await prisma.report.findFirst({
      where: { id: reportId, clientId },
      include: { client: { select: { name: true } } },
    });

    if (!report) {
      sendError(res, 'Report not found', 404);
      return;
    }

    const content = report.contentJson as { sections?: Array<{ type: string; title: string; content: string; agentType?: string }> };
    const sections = content?.sections || [];

    const buffer = await generatePptx({
      reportTitle: report.title,
      clientName: report.client.name,
      createdAt: report.createdAt.toISOString(),
      sections,
    });

    const safeTitle = report.title.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.pptx"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error('PPTX export error:', error);
    sendError(res, 'Failed to generate PPTX', 500);
  }
});

export default router;
