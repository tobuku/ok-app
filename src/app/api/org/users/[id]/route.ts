import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

/** PATCH /api/org/users/:id — update user (Org Admin only) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireOrgUser(["ORG_ADMIN"], true);
  if (user instanceof Response) return user;

  const { id } = await params;

  // Verify user belongs to this org
  const target = await prisma.user.findFirst({
    where: { id, orgId: user.orgId },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Cannot modify yourself (prevent locking yourself out)
  if (target.id === user.id) {
    return NextResponse.json(
      { error: "Cannot modify your own account from this endpoint" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = body.name.trim();
  if (body.phone !== undefined) data.phone = body.phone?.trim() || null;
  if (body.role !== undefined) {
    const validRoles = ["LEADMAN", "DISPATCHER", "ORG_ADMIN"];
    if (!validRoles.includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    data.role = body.role;
  }
  if (body.active !== undefined) data.active = Boolean(body.active);

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      role: true,
      email: true,
      phone: true,
      active: true,
    },
  });

  await auditLog({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "UPDATE",
    entity: "user",
    entityId: id,
    meta: { fields: Object.keys(data) },
  });

  return NextResponse.json(updated);
}
