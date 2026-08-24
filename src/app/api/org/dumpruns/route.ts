import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { tenantScope } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

/** GET /api/org/dumpruns — list dump runs, optionally filtered by date range */
export async function GET(req: NextRequest) {
  const user = await requireOrgUser(["DISPATCHER", "ORG_ADMIN"]);
  if (user instanceof Response) return user;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (from || to) {
    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.gte = new Date(from + "T00:00:00");
    if (to) dateFilter.lte = new Date(to + "T23:59:59.999");
    where.runAt = dateFilter;
  }

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });
  const runs = await t.findMany("dumpRun", {
    where,
    include: {
      truck: { select: { id: true, name: true } },
      dumpSite: { select: { id: true, name: true } },
      dumpRunJobs: {
        include: {
          job: { select: { id: true, jobNumber: true } },
        },
      },
    },
    orderBy: { runAt: "desc" },
  });

  return NextResponse.json(runs);
}

/** POST /api/org/dumpruns — create dump run */
export async function POST(req: NextRequest) {
  const user = await requireOrgUser(["DISPATCHER", "ORG_ADMIN"], true);
  if (user instanceof Response) return user;

  const body = await req.json();
  const { truckId, dumpSiteId, runAt, weightLbs, feeCents, notes, jobIds } = body;

  if (!truckId || !dumpSiteId || !runAt) {
    return NextResponse.json(
      { error: "truckId, dumpSiteId, and runAt are required" },
      { status: 400 }
    );
  }

  // Verify truck and dump site belong to this org
  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });
  const [truck, site] = await Promise.all([
    t.findFirst("truck", { where: { id: truckId } }),
    t.findFirst("dumpSite", { where: { id: dumpSiteId } }),
  ]);
  if (!truck) return NextResponse.json({ error: "Truck not found" }, { status: 404 });
  if (!site) return NextResponse.json({ error: "Dump site not found" }, { status: 404 });

  // Create dump run with linked jobs in a transaction
  const dumpRun = await prisma.dumpRun.create({
    data: {
      orgId: user.orgId,
      truckId,
      dumpSiteId,
      runAt: new Date(runAt),
      weightLbs: weightLbs ?? null,
      feeCents: feeCents ?? null,
      notes: notes?.trim() || null,
      dumpRunJobs: Array.isArray(jobIds) && jobIds.length > 0
        ? { create: jobIds.map((jobId: string) => ({ jobId })) }
        : undefined,
    },
    include: {
      truck: { select: { id: true, name: true } },
      dumpSite: { select: { id: true, name: true } },
      dumpRunJobs: { include: { job: { select: { id: true, jobNumber: true } } } },
    },
  });

  // Audit log
  const { auditLog } = await import("@/lib/audit");
  await auditLog({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "CREATE",
    entity: "dumpRun",
    entityId: dumpRun.id,
    meta: {},
  });

  return NextResponse.json(dumpRun, { status: 201 });
}
