import crypto from 'crypto';
import { prisma } from './prisma';

const KEY_PREFIX = 'grbi_';
const KEY_LENGTH = 32;

/**
 * Generate a new API key. Returns the raw key (shown once) and the stored record.
 */
export async function generateApiKey(orgId: string, name: string, scopeClientId?: string) {
  const rawKey = KEY_PREFIX + crypto.randomBytes(KEY_LENGTH).toString('hex');
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.substring(0, 12) + '...';

  const record = await prisma.apiKey.create({
    data: {
      orgId,
      name,
      keyHash,
      keyPrefix,
      scopeClientId: scopeClientId || null,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopeClientId: true,
      createdAt: true,
    },
  });

  return { ...record, rawKey };
}

/**
 * Validate an API key and return the associated org/scope.
 */
export async function validateApiKey(rawKey: string) {
  if (!rawKey.startsWith(KEY_PREFIX)) return null;

  const keyHash = hashKey(rawKey);

  const record = await prisma.apiKey.findUnique({
    where: { keyHash },
  });

  if (!record || record.revokedAt) return null;

  // Update last used timestamp (fire-and-forget)
  prisma.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return {
    id: record.id,
    orgId: record.orgId,
    scopeClientId: record.scopeClientId,
  };
}

/**
 * Revoke an API key.
 */
export async function revokeApiKey(id: string, orgId: string) {
  return prisma.apiKey.updateMany({
    where: { id, orgId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * List API keys for an org (never returns hashes).
 */
export async function listApiKeys(orgId: string) {
  return prisma.apiKey.findMany({
    where: { orgId },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopeClientId: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

function hashKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
