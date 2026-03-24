import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../lib/jwt';
import { sendError } from '../lib/response';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    sendError(res, 'Authentication required', 401);
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    sendError(res, 'Invalid or expired token', 401);
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(res, 'Insufficient permissions', 403);
      return;
    }

    next();
  };
}

export function requireClientAccess(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    sendError(res, 'Authentication required', 401);
    return;
  }

  // Admin and leadership can access all clients
  if (req.user.role === 'admin' || req.user.role === 'leadership') {
    next();
    return;
  }

  const clientId = req.params.id || req.params.clientId || req.body?.clientId;
  if (clientId && !req.user.assignedClientIds.includes(clientId)) {
    sendError(res, 'Access denied to this client', 403);
    return;
  }

  next();
}
