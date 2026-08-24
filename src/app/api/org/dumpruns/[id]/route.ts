import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { tenantScope } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

/** PATCH /api/org/dumpruns/:id — update dump run */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireOrgUser(["DISPATCHER", "ORG_ADMIN"], true);
  if (user instanceof Response) return user;

  const { id } = await params;
  const body = await req.json();
  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  // Verify dump run belongs to org
  const existing = await t.findFirst("dumpRun", { where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Dump run not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (body.truckId !== undefined) data.truckId = body.truckId;
  if (body.dumpSiteId !== undefined) data.dumpSiteId = body.dumpSiteId;
  if (body.runAt !== undefined) data.runAt = new Date(body.runAt);
  if (body.weightLbs !== undefined) data.weightLbs = body.weightLbs;
  if (body.feeCents !== undefined) data.feeCents = body.feeCents;
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null;

  // Update dump run + optionally replace linked jobs
  const updated = await prisma.dumpRun.update({
    where: { id },
    data,
    include: {
      truck: { select: { id: true, name: true } },
      dumpSite: { select: { id: true, name: true } },
      dumpRunJobs: { include: { job: { select: { id: true, jobNumber: true } } } },
    },
  });

  // Replace linked jobs if provided
  if (Array.isArray(body.jobIds)) {
    await prisma.dumpRunJob.deleteMany({ where: { dumpRunId: id } });
    if (body.jobIds.length > 0) {
      await prisma.dumpRunJob.createMany({
        data: body.jobIds.map((jobId: string) => ({ dumpRunId: id, jobId })),
      });
    }
  }

  await auditLog({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "UPDATE",
    entity: "dumpRun",
    entityId: id,
    meta: {},
  });

  return NextResponse.json(updated);
}

/** DELETE /api/org/dumpruns/:id — hard-delete dump run */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireOrgUser(["DISPATCHER", "ORG_ADMIN"], true);
  if (user instanceof Response) return user;

  const { id } = await params;
  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  // Verify belongs to org
  const existing = await t.findFirst("dumpRun", { where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Dump run not found" }, { status: 404 });
  }

  // Delete linked jobs first (cascade should handle but be explicit)
  await prisma.dumpRunJob.deleteMany({ where: { dumpRunId: id } });
  await prisma.dumpRun.delete({ where: { id } });

  await auditLog({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "DELETE",
    entity: "dumpRun",
    entityId: id,
    meta: {},
  });

  return NextResponse.json({ ok: true });
}
