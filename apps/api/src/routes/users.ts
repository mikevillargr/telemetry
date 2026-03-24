import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendError } from '../lib/response';
import { authenticate, requireRole } from '../middleware/auth';
import { writeAuditLog } from '../lib/audit';
import { inviteUserSchema, updateUserRoleSchema } from '@gr-bi/shared';

const router = Router();

// All user routes require authentication + admin
router.use(authenticate);
router.use(requireRole('admin'));

// GET /api/users — list all users in the org
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      where: { orgId: req.user!.orgId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        userClients: {
          include: {
            client: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, users);
  } catch (error) {
    console.error('List users error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

// POST /api/users/invite — create user with role assignment
router.post('/invite', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = inviteUserSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, parsed.error.errors[0].message);
      return;
    }

    const { email, name, role, assignClientIds, password } = parsed.data;

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      sendError(res, 'User with this email already exists', 409);
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        orgId: req.user!.orgId,
        email,
        name,
        hashedPassword,
        role,
        userClients: {
          create: assignClientIds.map((clientId) => ({ clientId })),
        },
      },
      include: {
        userClients: {
          include: {
            client: { select: { id: true, name: true } },
          },
        },
      },
    });

    await writeAuditLog({
      orgId: req.user!.orgId,
      userId: req.user!.userId,
      action: 'user.invite',
      entityType: 'user',
      entityId: user.id,
      details: { email, role, assignedClients: assignClientIds },
    });

    sendSuccess(res, {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      userClients: user.userClients,
    }, 201);
  } catch (error) {
    console.error('Invite user error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

// PATCH /api/users/:id/role — change role
router.patch('/:id/role', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id as string;
    const parsed = updateUserRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, parsed.error.errors[0].message);
      return;
    }

    const targetUser = await prisma.user.findFirst({
      where: { id: userId, orgId: req.user!.orgId },
    });

    if (!targetUser) {
      sendError(res, 'User not found', 404);
      return;
    }

    const oldRole = targetUser.role;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: parsed.data.role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    await writeAuditLog({
      orgId: req.user!.orgId,
      userId: req.user!.userId,
      action: 'user.role_change',
      entityType: 'user',
      entityId: user.id,
      details: { oldRole, newRole: parsed.data.role },
    });

    sendSuccess(res, user);
  } catch (error) {
    console.error('Update user role error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

export default router;
