import { Router, Request, Response } from 'express';
import { ConnectorType } from '@gr-bi/shared';
import { prisma } from '../lib/prisma';
import { encrypt, decrypt } from '../lib/encryption';
import { sendSuccess, sendError } from '../lib/response';
import { authenticate, requireClientAccess } from '../middleware/auth';
import { writeAuditLog } from '../lib/audit';
import { getConnector, getAllConnectorInfo } from '../connectors';
import { chunkNormalizedData } from '../lib/chunker';
import { storeChunks } from '../lib/rag';

const router = Router();
router.use(authenticate);

// GET /api/connectors/types — list all available connector types + field defs
router.get('/types', (_req: Request, res: Response): void => {
  sendSuccess(res, getAllConnectorInfo());
});

// GET /api/connectors/:clientId — list credentials for a client
router.get('/:clientId', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId as string;
    const credentials = await prisma.connectorCredential.findMany({
      where: { clientId },
      select: {
        id: true,
        clientId: true,
        connectorType: true,
        lastSynced: true,
      },
    });

    sendSuccess(res, credentials);
  } catch (error) {
    console.error('List connectors error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

// POST /api/connectors/:clientId — add/update connector credentials
router.post('/:clientId', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId as string;
    const { connectorType, credentials } = req.body;

    if (!connectorType || !credentials) {
      sendError(res, 'connectorType and credentials are required');
      return;
    }

    // Verify credentials with the connector
    const connector = getConnector(connectorType as ConnectorType);
    if (!connector) {
      sendError(res, `Unknown connector type: ${connectorType}`);
      return;
    }

    const valid = await connector.verify(credentials);
    if (!valid) {
      sendError(res, 'Credentials verification failed. Check your inputs and try again.');
      return;
    }

    // Encrypt and store
    const encrypted = encrypt(JSON.stringify(credentials));

    // Upsert: update if exists, create if new
    const existing = await prisma.connectorCredential.findFirst({
      where: { clientId, connectorType },
    });

    let record;
    if (existing) {
      record = await prisma.connectorCredential.update({
        where: { id: existing.id },
        data: { credentialsEncrypted: encrypted },
        select: { id: true, clientId: true, connectorType: true, lastSynced: true },
      });
    } else {
      record = await prisma.connectorCredential.create({
        data: {
          clientId,
          connectorType,
          credentialsEncrypted: encrypted,
        },
        select: { id: true, clientId: true, connectorType: true, lastSynced: true },
      });
    }

    await writeAuditLog({
      orgId: req.user!.orgId,
      userId: req.user!.userId,
      action: existing ? 'connector.update' : 'connector.create',
      entityType: 'connector_credential',
      entityId: record.id,
      details: { connectorType, clientId },
    });

    sendSuccess(res, record, existing ? 200 : 201);
  } catch (error) {
    console.error('Save connector error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

// DELETE /api/connectors/:clientId/:connectorType — remove a connector
router.delete('/:clientId/:connectorType', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId as string;
    const connectorType = req.params.connectorType as string;

    const existing = await prisma.connectorCredential.findFirst({
      where: { clientId, connectorType: connectorType as ConnectorType },
    });

    if (!existing) {
      sendError(res, 'Connector not found', 404);
      return;
    }

    await prisma.connectorCredential.delete({ where: { id: existing.id } });

    await writeAuditLog({
      orgId: req.user!.orgId,
      userId: req.user!.userId,
      action: 'connector.delete',
      entityType: 'connector_credential',
      entityId: existing.id,
      details: { connectorType, clientId },
    });

    sendSuccess(res, { deleted: true });
  } catch (error) {
    console.error('Delete connector error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

// POST /api/connectors/:clientId/:connectorType/pull — trigger a data pull
router.post('/:clientId/:connectorType/pull', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId as string;
    const connectorType = req.params.connectorType as ConnectorType;
    const { dateRangeStart, dateRangeEnd } = req.body;

    if (!dateRangeStart || !dateRangeEnd) {
      sendError(res, 'dateRangeStart and dateRangeEnd are required');
      return;
    }

    // Find credentials
    const credRecord = await prisma.connectorCredential.findFirst({
      where: { clientId, connectorType },
    });

    if (!credRecord) {
      sendError(res, 'No credentials found for this connector. Connect it first.', 404);
      return;
    }

    const connector = getConnector(connectorType);
    if (!connector) {
      sendError(res, `Unknown connector type: ${connectorType}`);
      return;
    }

    // Create a pull record
    const pull = await prisma.dataPull.create({
      data: {
        clientId,
        connectorType,
        status: 'running',
        dateRangeStart: new Date(dateRangeStart),
        dateRangeEnd: new Date(dateRangeEnd),
      },
    });

    // Execute pull (async in background, but for now synchronous for simplicity)
    try {
      const credentials = JSON.parse(decrypt(credRecord.credentialsEncrypted));
      const data = await connector.pull(credentials, {
        clientId,
        dateRangeStart,
        dateRangeEnd,
      });

      // Update pull record with success
      const updated = await prisma.dataPull.update({
        where: { id: pull.id },
        data: {
          status: 'success',
          rowCount: data.rows.length,
          resultJson: JSON.parse(JSON.stringify(data)),
          completedAt: new Date(),
        },
      });

      // Update last synced on credential
      await prisma.connectorCredential.update({
        where: { id: credRecord.id },
        data: { lastSynced: new Date() },
      });

      await writeAuditLog({
        orgId: req.user!.orgId,
        userId: req.user!.userId,
        action: 'connector.pull',
        entityType: 'data_pull',
        entityId: pull.id,
        details: { connectorType, clientId, rowCount: data.rows.length },
      });

      // Auto-embed pulled data in background (fire-and-forget)
      const clientRecord = await prisma.client.findUnique({ where: { id: clientId }, select: { name: true } });
      const chunks = chunkNormalizedData(data, clientRecord?.name);
      if (chunks.length > 0) {
        storeChunks(clientId, chunks, 'data')
          .then((r) => console.log(`✓ Auto-embedded ${r.stored} chunks for pull ${pull.id}`))
          .catch((e) => console.error(`✗ Auto-embed failed for pull ${pull.id}:`, e.message));
      }

      sendSuccess(res, updated, 201);
    } catch (pullError) {
      // Update pull record with error
      await prisma.dataPull.update({
        where: { id: pull.id },
        data: {
          status: 'error',
          error: pullError instanceof Error ? pullError.message : 'Pull failed',
          completedAt: new Date(),
        },
      });

      sendError(res, pullError instanceof Error ? pullError.message : 'Data pull failed', 500);
    }
  } catch (error) {
    console.error('Trigger pull error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

// GET /api/connectors/:clientId/pulls — list pull history for a client
router.get('/:clientId/pulls', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId as string;
    const pulls = await prisma.dataPull.findMany({
      where: { clientId },
      orderBy: { startedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        clientId: true,
        connectorType: true,
        status: true,
        rowCount: true,
        error: true,
        dateRangeStart: true,
        dateRangeEnd: true,
        startedAt: true,
        completedAt: true,
      },
    });

    sendSuccess(res, pulls);
  } catch (error) {
    console.error('List pulls error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

export default router;
