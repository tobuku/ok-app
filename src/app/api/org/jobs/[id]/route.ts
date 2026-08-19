import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { tenantScope } from "@/lib/tenant";

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
