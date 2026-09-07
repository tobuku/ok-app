import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { tenantScope } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";

/** GET /api/org/jobs/:id */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireOrgUser(["LEADMAN", "DISPATCHER", "ORG_ADMIN"]);
  if (user instanceof Response) return user;

  const { id } = await params;
  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  const where: Record<string, unknown> = { id };
  if (user.role === "LEADMAN") where.assignedToId = user.id;

  const job = await t.findFirst("job", {
    where,
    include: {
      customer: true,
      address: true,
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  return NextResponse.json(job);
}

/** PATCH /api/org/jobs/:id — update job details (Dispatcher, Org Admin) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireOrgUser(["DISPATCHER", "ORG_ADMIN"], true);
  if (user instanceof Response) return user;

  const { id } = await params;
  const body = await req.json();
  const allowed = [
    "customerId", "addressId", "scheduledDate", "timeWindowStart",
    "timeWindowEnd", "assignedToId", "truckId", "notes", "source",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      if (["scheduledDate", "timeWindowStart", "timeWindowEnd"].includes(key)) {
        data[key] = body[key] ? new Date(body[key]) : null;
      } else {
        data[key] = body[key] || null;
      }
    }
  }

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });
  const updated = await t.update("job", { where: { id }, data });
  return NextResponse.json(updated);
}

/** DELETE /api/org/jobs/:id — delete a job and all related records (Dispatcher, Org Admin) */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireOrgUser(["DISPATCHER", "ORG_ADMIN"], true);
  if (user instanceof Response) return user;

  const { id } = await params;
  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  // Verify job exists in this org
  const job = await t.findFirst<{ id: string }>("job", {
    where: { id },
    select: { id: true },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Delete photos from storage
  const photos = await t.findMany<{ id: string; storageKey: string }>("photo", {
    where: { jobId: id },
  });
  for (const photo of photos) {
    await deleteFile(photo.storageKey).catch(() => {});
  }

  // Delete all related records in dependency order, then the job
  await prisma.$transaction(async (tx) => {
    // Quote lines (depend on quotes)
    const quotes = await tx.quote.findMany({
      where: { jobId: id, orgId: user.orgId },
      select: { id: true },
    });
    const quoteIds = quotes.map((q) => q.id);
    if (quoteIds.length > 0) {
      await tx.quoteLine.deleteMany({ where: { quoteId: { in: quoteIds } } });
    }
    await tx.quote.deleteMany({ where: { jobId: id, orgId: user.orgId } });
    await tx.payment.deleteMany({ where: { jobId: id, orgId: user.orgId } });
    await tx.photo.deleteMany({ where: { jobId: id, orgId: user.orgId } });
    await tx.jobNote.deleteMany({ where: { jobId: id, orgId: user.orgId } });
    await tx.job.delete({ where: { id } });
  });

  // Audit log
  const { auditLog } = await import("@/lib/audit");
  await auditLog({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "DELETE",
    entity: "job",
    entityId: id,
    meta: {},
  });

  return NextResponse.json({ deleted: id });
}
