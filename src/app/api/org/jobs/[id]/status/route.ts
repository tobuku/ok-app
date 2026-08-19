import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { tenantScope } from "@/lib/tenant";
import { assertTransition } from "@/lib/status";
import type { JobStatus } from "@prisma/client";

/** POST /api/org/jobs/:id/status — guarded status transition */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireOrgUser(["LEADMAN", "DISPATCHER", "ORG_ADMIN"], true);
  if (user instanceof Response) return user;

  const { id } = await params;
  const body = await req.json();
  const { status: newStatus, cancelReason } = body as {
    status: JobStatus;
    cancelReason?: string;
  };

  if (!newStatus) {
    return NextResponse.json({ error: "status is required" }, { status: 400 });
  }

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  // Leadman can only transition their own assigned jobs
  const where: Record<string, unknown> = { id };
  if (user.role === "LEADMAN") where.assignedToId = user.id;

  const job = await t.findFirst<{ id: string; status: JobStatus }>("job", {
    where,
    select: { id: true, status: true },
  } as Record<string, unknown>);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  try {
    assertTransition(job.status, newStatus);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 422 }
    );
  }

  // Build timestamp fields based on transition
  const timestamps: Record<string, unknown> = {};
  if (newStatus === "EN_ROUTE") timestamps.enRouteAt = new Date();
  if (newStatus === "ON_SITE") timestamps.onSiteAt = new Date();
  if (newStatus === "COMPLETED") timestamps.completedAt = new Date();
  if (newStatus === "CANCELED") {
    timestamps.canceledAt = new Date();
    timestamps.cancelReason = cancelReason || null;
  }

  const updated = await t.update("job", {
    where: { id: job.id },
    data: { status: newStatus, ...timestamps },
  });

  return NextResponse.json(updated);
}
