import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { tenantScope } from "@/lib/tenant";
import { auditLog } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

/** GET /api/org/customers/:id */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireOrgUser(["DISPATCHER", "ORG_ADMIN"]);
  if (user instanceof Response) return user;

  const { id } = await params;
  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });
  const customer = await t.findUnique("customer", {
    where: { id },
    include: { addresses: true },
  });

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }
  return NextResponse.json(customer);
}

/** PATCH /api/org/customers/:id */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireOrgUser(["DISPATCHER", "ORG_ADMIN"], true);
  if (user instanceof Response) return user;

  const { id } = await params;
  const body = await req.json();
  const { name, phone, email, notes } = body;

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  // Fetch current values for audit before/after
  const existing = await t.findUnique("customer", {
    where: { id },
  }) as { id: string; name: string; phone: string | null; email: string | null; notes: string | null } | null;

  if (!existing) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};

  if (name !== undefined && name !== existing.name) {
    data.name = name;
    before.name = existing.name;
    after.name = name;
  }
  if (phone !== undefined && (phone || null) !== existing.phone) {
    data.phone = phone || null;
    before.phone = existing.phone;
    after.phone = phone || null;
  }
  if (email !== undefined && (email || null) !== existing.email) {
    data.email = email || null;
    before.email = existing.email;
    after.email = email || null;
  }
  if (notes !== undefined && (notes || null) !== existing.notes) {
    data.notes = notes || null;
    before.notes = existing.notes;
    after.notes = notes || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(existing);
  }

  const updated = await t.update("customer", {
    where: { id },
    data,
  });

  // Write audit log with before/after
  await auditLog({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "UPDATE",
    entity: "customer",
    entityId: id,
    meta: { before, after } as Prisma.InputJsonValue,
  });

  return NextResponse.json(updated);
}
