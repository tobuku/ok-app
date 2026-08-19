import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

export async function auditLog(entry: {
  orgId?: string;
  actorUserId?: string;
  actorPlatformUserId?: string;
  action: string;
  entity: string;
  entityId: string;
  meta?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      orgId: entry.orgId ?? null,
      actorUserId: entry.actorUserId ?? null,
      actorPlatformUserId: entry.actorPlatformUserId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      meta: entry.meta ?? {},
    },
  });
}
