import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendError } from '../lib/response';
import { authenticate, requireRole, requireClientAccess } from '../middleware/auth';
import { writeAuditLog } from '../lib/audit';
import { createClientSchema, updateClientSchema } from '@gr-bi/shared';

const router = Router();

// All client routes require authentication
router.use(authenticate);

// GET /api/clients — list all clients (scoped to user's assigned clients)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    let clients;
    if (user.role === 'admin' || user.role === 'leadership') {
      clients = await prisma.client.findMany({
        where: { orgId: user.orgId },
        include: {
          userClients: {
            include: {
              user: {
                select: { id: true, name: true, email: true, role: true },
              },
            },
          },
          connectorCredentials: {
            select: { connectorType: true, lastSynced: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      clients = await prisma.client.findMany({
        where: {
          orgId: user.orgId,
          userClients: {
            some: { userId: user.userId },
          },
        },
        include: {
          userClients: {
            include: {
              user: {
                select: { id: true, name: true, email: true, role: true },
              },
            },
          },
          connectorCredentials: {
            select: { connectorType: true, lastSynced: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    sendSuccess(res, clients);
  } catch (error) {
    console.error('List clients error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

// POST /api/clients — create client (admin only)
router.post('/', requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createClientSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, parsed.error.errors[0].message);
      return;
    }

    const client = await prisma.client.create({
      data: {
        orgId: req.user!.orgId,
        ...parsed.data,
      },
    });

    await writeAuditLog({
      orgId: req.user!.orgId,
      userId: req.user!.userId,
      action: 'client.create',
      entityType: 'client',
      entityId: client.id,
      details: { name: client.name },
    });

    sendSuccess(res, client, 201);
  } catch (error) {
    console.error('Create client error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

// GET /api/clients/:id — get client detail
router.get('/:id', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.id as string;
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        orgId: req.user!.orgId,
      },
      include: {
        userClients: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        connectorCredentials: {
          select: { id: true, connectorType: true, lastSynced: true },
        },
      },
    });

    if (!client) {
      sendError(res, 'Client not found', 404);
      return;
    }

    sendSuccess(res, client);
  } catch (error) {
    console.error('Get client error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

// PATCH /api/clients/:id — update client config
router.patch('/:id', requireClientAccess, async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.id as string;
    const parsed = updateClientSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, parsed.error.errors[0].message);
      return;
    }

    const existing = await prisma.client.findFirst({
      where: { id: clientId, orgId: req.user!.orgId },
    });

    if (!existing) {
      sendError(res, 'Client not found', 404);
      return;
    }

    const client = await prisma.client.update({
      where: { id: clientId },
      data: parsed.data,
    });

    await writeAuditLog({
      orgId: req.user!.orgId,
      userId: req.user!.userId,
      action: 'client.update',
      entityType: 'client',
      entityId: client.id,
      details: { updatedFields: Object.keys(parsed.data) },
    });

    sendSuccess(res, client);
  } catch (error) {
    console.error('Update client error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

export default router;
