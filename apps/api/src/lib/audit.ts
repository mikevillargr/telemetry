import { prisma } from './prisma';

export async function writeAuditLog(params: {
  orgId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      orgId: params.orgId,
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: (params.details || {}) as Record<string, string>,
    },
  });
}
