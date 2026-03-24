import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';
import { sendSuccess, sendError } from '../lib/response';
import { authenticate } from '../middleware/auth';
import { loginSchema } from '@gr-bi/shared';

const router = Router();

// POST /auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, parsed.error.errors[0].message);
      return;
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userClients: {
          select: { clientId: true },
        },
      },
    });

    if (!user) {
      sendError(res, 'Invalid email or password', 401);
      return;
    }

    const validPassword = await bcrypt.compare(password, user.hashedPassword);
    if (!validPassword) {
      sendError(res, 'Invalid email or password', 401);
      return;
    }

    const assignedClientIds = user.userClients.map((uc) => uc.clientId);

    const token = signToken({
      userId: user.id,
      orgId: user.orgId,
      role: user.role,
      assignedClientIds,
    });

    // Set httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    sendSuccess(res, {
      token,
      user: {
        id: user.id,
        orgId: user.orgId,
        email: user.email,
        name: user.name,
        role: user.role,
        assignedClientIds,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

// POST /auth/logout
router.post('/logout', (_req: Request, res: Response): void => {
  res.clearCookie('token', { path: '/' });
  sendSuccess(res, { message: 'Logged out' });
});

// GET /auth/me
router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        userClients: {
          include: {
            client: {
              select: { id: true, name: true, industry: true },
            },
          },
        },
      },
    });

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    const assignedClients = user.userClients.map((uc) => uc.client);
    const assignedClientIds = assignedClients.map((c) => c.id);

    sendSuccess(res, {
      id: user.id,
      orgId: user.orgId,
      email: user.email,
      name: user.name,
      role: user.role,
      assignedClientIds,
      assignedClients,
    });
  } catch (error) {
    console.error('Auth me error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

export default router;
