import { Request, Response, NextFunction } from 'express';
import { validateApiKey } from '../lib/api-keys';
import { sendError } from '../lib/response';

declare global {
  namespace Express {
    interface Request {
      apiKey?: {
        id: string;
        orgId: string;
        scopeClientId: string | null;
      };
    }
  }
}

/**
 * Authenticate requests using an API key in the X-API-Key header.
 */
export function authenticateApiKey(req: Request, res: Response, next: NextFunction): void {
  const rawKey = req.headers['x-api-key'] as string;

  if (!rawKey) {
    sendError(res, 'API key required. Set X-API-Key header.', 401);
    return;
  }

  validateApiKey(rawKey).then((result) => {
    if (!result) {
      sendError(res, 'Invalid or revoked API key', 401);
      return;
    }

    req.apiKey = result;
    next();
  }).catch(() => {
    sendError(res, 'API key validation failed', 500);
  });
}

/**
 * Ensure the API key has access to the requested client (via :clientId param).
 * If the key is scoped to a specific client, only that client is allowed.
 */
export function requireApiKeyClientAccess(req: Request, res: Response, next: NextFunction): void {
  if (!req.apiKey) {
    sendError(res, 'API key required', 401);
    return;
  }

  const clientId = req.params.clientId;
  if (!clientId) {
    next();
    return;
  }

  // If key is scoped to a client, enforce it
  if (req.apiKey.scopeClientId && req.apiKey.scopeClientId !== clientId) {
    sendError(res, 'API key does not have access to this client', 403);
    return;
  }

  next();
}
