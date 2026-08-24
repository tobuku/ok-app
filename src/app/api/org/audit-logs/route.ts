import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/org/audit-logs — paginated audit log for this org (Org Admin only) */
export async function GET(req: NextRequest) {
  const user = await requireOrgUser(["ORG_ADMIN"]);
  if (user instanceof Response) return user;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const entity = searchParams.get("entity");
  const action = searchParams.get("action");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = { orgId: user.orgId };
  if (entity) where.entity = entity;
  if (action) where.action = action;
  if (from || to) {
    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.gte = new Date(from + "T00:00:00");
    if (to) dateFilter.lte = new Date(to + "T23:59:59.999");
    where.createdAt = dateFilter;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        // Include actor user name if available (actorUserId is on User table)
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  // Enrich with actor names
  const actorIds = [...new Set(logs.map((l) => l.actorUserId).filter(Boolean))] as string[];
  const actors = actorIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true },
      })
    : [];
  const actorMap = Object.fromEntries(actors.map((a) => [a.id, a.name]));

  const enriched = logs.map((log) => ({
    ...log,
    actorName: log.actorUserId ? actorMap[log.actorUserId] ?? null : null,
  }));

  return NextResponse.json({
    logs: enriched,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
