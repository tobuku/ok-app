import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/org/customers/:id/history — audit log for customer (ORG_ADMIN only) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireOrgUser(["ORG_ADMIN"]);
  if (user instanceof Response) return user;

  const { id } = await params;

  // Fetch audit entries for this customer and its addresses
  const entries = await prisma.auditLog.findMany({
    where: {
      orgId: user.orgId,
      OR: [
        { entity: "customer", entityId: id },
        { entity: "address", meta: { path: ["customerId"], equals: id } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      organization: false,
    },
  });

  // Enrich with actor names
  const actorIds = [...new Set(entries.map((e) => e.actorUserId).filter(Boolean))] as string[];
  const actors = actorIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true },
      })
    : [];
  const actorMap = Object.fromEntries(actors.map((a) => [a.id, a.name]));

  const result = entries.map((e) => ({
    id: e.id,
    action: e.action,
    entity: e.entity,
    entityId: e.entityId,
    meta: e.meta,
    actorName: e.actorUserId ? actorMap[e.actorUserId] ?? "Unknown" : "System",
    createdAt: e.createdAt,
  }));

  return NextResponse.json(result);
}
