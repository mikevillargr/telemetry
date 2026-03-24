import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { sendSuccess, sendError } from '../lib/response';
import { generateApiKey, revokeApiKey, listApiKeys } from '../lib/api-keys';
import { writeAuditLog } from '../lib/audit';

const router = Router();
router.use(authenticate);
router.use(requireRole('admin'));

// GET /api/api-keys — list all keys for the org
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const keys = await listApiKeys(req.user!.orgId);
    sendSuccess(res, keys);
  } catch (error) {
    console.error('List API keys error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

// POST /api/api-keys — generate a new key
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, scopeClientId } = req.body;
    if (!name) {
      sendError(res, 'name is required');
      return;
    }

    const result = await generateApiKey(req.user!.orgId, name, scopeClientId);

    await writeAuditLog({
      orgId: req.user!.orgId,
      userId: req.user!.userId,
      action: 'api_key.create',
      entityType: 'api_key',
      entityId: result.id,
      details: { name, scopeClientId },
    });

    sendSuccess(res, result, 201);
  } catch (error) {
    console.error('Generate API key error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

// DELETE /api/api-keys/:id — revoke a key
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await revokeApiKey(id as string, req.user!.orgId);

    await writeAuditLog({
      orgId: req.user!.orgId,
      userId: req.user!.userId,
      action: 'api_key.revoke',
      entityType: 'api_key',
      entityId: id as string,
      details: {},
    });

    sendSuccess(res, { revoked: true });
  } catch (error) {
    console.error('Revoke API key error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

export default router;
