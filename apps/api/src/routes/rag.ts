import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticate, requireClientAccess } from '../middleware/auth';
import { sendSuccess, sendError } from '../lib/response';
import { semanticSearch, storeChunks, deleteClientDocuments, getClientDocumentStats } from '../lib/rag';
import { chunkNormalizedData, chunkText, chunkCsv } from '../lib/chunker';
import { writeAuditLog } from '../lib/audit';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(authenticate);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

// POST /api/rag/:clientId/search — semantic search
router.post('/:clientId/search', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId;
    const query = req.body.query as string | undefined;
    const limit = req.body.limit as number | undefined;
    const contentTypes = req.body.contentTypes as string[] | undefined;
    const dateFrom = req.body.dateFrom as string | undefined;
    const dateTo = req.body.dateTo as string | undefined;
    const minSimilarity = req.body.minSimilarity as number | undefined;

    if (!query || typeof query !== 'string') {
      sendError(res, 'query is required');
      return;
    }

    const results = await semanticSearch(clientId, query, {
      limit: limit || 10,
      contentTypes,
      dateFrom,
      dateTo,
      minSimilarity,
    });

    sendSuccess(res, { results, count: results.length });
  } catch (error) {
    console.error('RAG search error:', error);
    sendError(res, error instanceof Error ? error.message : 'Search failed', 500);
  }
});

// POST /api/rag/:clientId/ingest — ingest text content
router.post('/:clientId/ingest', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId;
    const content = req.body.content as string | undefined;
    const contentType = req.body.contentType as string | undefined;
    const metadata = req.body.metadata as Record<string, unknown> | undefined;
    const authorAgent = req.body.authorAgent as 'data' | 'visualization' | 'strategy' | 'trends' | undefined;

    if (!content || typeof content !== 'string') {
      sendError(res, 'content is required');
      return;
    }

    const validContentType = (contentType || 'data_pull') as 'data_pull' | 'report' | 'recommendation' | 'strategy' | 'onboarding_brief' | 'trends_digest';
    const chunks = chunkText(content, validContentType, metadata || {});
    const result = await storeChunks(clientId, chunks, authorAgent);

    await writeAuditLog({
      orgId: req.user!.orgId,
      userId: req.user!.userId,
      action: 'rag.ingest',
      entityType: 'rag_document',
      entityId: clientId,
      details: { chunksStored: result.stored, contentType: validContentType },
    });

    sendSuccess(res, result, 201);
  } catch (error) {
    console.error('RAG ingest error:', error);
    sendError(res, error instanceof Error ? error.message : 'Ingest failed', 500);
  }
});

// POST /api/rag/:clientId/upload — upload a file (CSV/TXT) and embed it
router.post('/:clientId/upload', requireClientAccess, upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId;
    const file = (req as Request & { file?: Express.Multer.File }).file;
    const description = (req.body.description as string) || 'Uploaded file';

    if (!file) {
      sendError(res, 'No file uploaded');
      return;
    }

    const text = file.buffer.toString('utf-8');
    const filename = file.originalname.toLowerCase();
    const metadata = { filename: file.originalname, size: file.size, mimeType: file.mimetype };

    let chunks;
    if (filename.endsWith('.csv')) {
      chunks = chunkCsv(text, description, metadata);
    } else {
      chunks = chunkText(text, 'data_pull', { ...metadata, description });
    }

    if (chunks.length === 0) {
      sendError(res, 'File produced no embeddable content');
      return;
    }

    const result = await storeChunks(clientId, chunks);

    await writeAuditLog({
      orgId: req.user!.orgId,
      userId: req.user!.userId,
      action: 'rag.upload',
      entityType: 'rag_document',
      entityId: clientId,
      details: { filename: file.originalname, chunksStored: result.stored },
    });

    sendSuccess(res, {
      filename: file.originalname,
      chunksStored: result.stored,
      fileSize: file.size,
    }, 201);
  } catch (error) {
    console.error('RAG upload error:', error);
    sendError(res, error instanceof Error ? error.message : 'Upload failed', 500);
  }
});

// POST /api/rag/:clientId/embed-pull/:pullId — embed an existing data pull
router.post('/:clientId/embed-pull/:pullId', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId;
    const pullId = req.params.pullId;

    const pulls = await prisma.$queryRawUnsafe<Array<{
      id: string;
      client_id: string;
      status: string;
      result_json: unknown;
      connector_type: string;
    }>>(
      `SELECT id, client_id, status, result_json, connector_type FROM data_pulls WHERE id = $1 AND client_id = $2 LIMIT 1`,
      pullId,
      clientId,
    );
    const pull = pulls[0] || null;

    if (!pull) {
      sendError(res, 'Data pull not found', 404);
      return;
    }

    if (pull.status !== 'success' || !pull.result_json) {
      sendError(res, 'Data pull has no results to embed');
      return;
    }

    // Get client name for context in chunks
    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { name: true } });
    const normalizedData = pull.result_json as unknown as import('@gr-bi/shared').NormalizedData;
    const chunks = chunkNormalizedData(normalizedData, client?.name);

    if (chunks.length === 0) {
      sendError(res, 'No embeddable content from this data pull');
      return;
    }

    const result = await storeChunks(clientId, chunks, 'data');

    await writeAuditLog({
      orgId: req.user!.orgId,
      userId: req.user!.userId,
      action: 'rag.embed_pull',
      entityType: 'data_pull',
      entityId: pullId,
      details: { connectorType: pull.connector_type, chunksStored: result.stored },
    });

    sendSuccess(res, {
      pullId,
      connectorType: pull.connector_type,
      chunksStored: result.stored,
    }, 201);
  } catch (error) {
    console.error('RAG embed-pull error:', error);
    sendError(res, error instanceof Error ? error.message : 'Embed failed', 500);
  }
});

// GET /api/rag/:clientId/stats — get document stats
router.get('/:clientId/stats', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId;
    const stats = await getClientDocumentStats(clientId);
    sendSuccess(res, stats);
  } catch (error) {
    console.error('RAG stats error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

// DELETE /api/rag/:clientId — delete all documents for a client
router.delete('/:clientId', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId;
    const { contentType } = req.query;
    const deleted = await deleteClientDocuments(clientId, contentType as string | undefined);

    await writeAuditLog({
      orgId: req.user!.orgId,
      userId: req.user!.userId,
      action: 'rag.delete',
      entityType: 'rag_document',
      entityId: clientId,
      details: { deletedCount: deleted, contentType: contentType || 'all' },
    });

    sendSuccess(res, { deleted });
  } catch (error) {
    console.error('RAG delete error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

// DELETE /api/rag/:clientId/documents/:documentId — delete a specific document by metadata
router.delete('/:clientId/documents/:documentId', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId as string;
    const documentId = req.params.documentId as string;

    // Delete chunks with matching metadata.documentId
    const deleted = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `DELETE FROM rag_chunks WHERE client_id = $1 AND metadata->>'documentId' = $2 RETURNING COUNT(*)`,
      clientId,
      documentId,
    );

    await writeAuditLog({
      orgId: req.user!.orgId,
      userId: req.user!.userId,
      action: 'rag.delete_document',
      entityType: 'rag_document',
      entityId: documentId,
      details: { clientId, deletedCount: Number(deleted[0]?.count || 0) },
    });

    sendSuccess(res, { deleted: Number(deleted[0]?.count || 0) });
  } catch (error) {
    console.error('RAG delete document error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

export default router;
