import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

/** GET /api/platform/orgs/:id — org detail */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePlatformAdmin();
  if (admin instanceof Response) return admin;

  const { id } = await params;

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      subscription: { include: { plan: true } },
      users: {
        select: { id: true, name: true, email: true, role: true, active: true },
      },
      _count: { select: { jobs: true, customers: true } },
    },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  return NextResponse.json(org);
}

/** PATCH /api/platform/orgs/:id — suspend, reactivate, update */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePlatformAdmin();
  if (admin instanceof Response) return admin;

  const { id } = await params;
  const body = await req.json();

  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  if (body.status !== undefined) {
    const validStatuses = ["TRIALING", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELED"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = body.status;
  }

  if (body.name !== undefined) data.name = body.name.trim();

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await prisma.organization.update({
    where: { id },
    data,
  });

  await auditLog({
    orgId: id,
    actorPlatformUserId: admin.id,
    action: body.status === "SUSPENDED" ? "SUSPEND_ORG" : "UPDATE_ORG",
    entity: "organization",
    entityId: id,
    meta: { fields: Object.keys(data) },
  });

  return NextResponse.json(updated);
}
