import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { tenantScope } from "@/lib/tenant";
import { auditLog } from "@/lib/audit";
import { geocode } from "@/lib/geocode";
import type { Prisma } from "@prisma/client";

/** POST /api/org/customers/:id/addresses — create address */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireOrgUser(["DISPATCHER", "ORG_ADMIN"], true);
  if (user instanceof Response) return user;

  const { id: customerId } = await params;
  const body = await req.json();
  const { line1, line2, city, state, zip } = body;

  if (!line1 || !city || !state || !zip) {
    return NextResponse.json(
      { error: "line1, city, state, zip are required" },
      { status: 400 }
    );
  }

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  // Verify customer belongs to org
  const customer = await t.findUnique("customer", { where: { id: customerId } });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Auto-geocode
  const coords = await geocode({ line1, city, state, zip });

  const address = await t.create("address", {
    data: {
      customerId,
      line1,
      line2: line2 || null,
      city,
      state,
      zip,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    },
  });

  await auditLog({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "CREATE",
    entity: "address",
    entityId: (address as { id: string }).id,
    meta: { customerId, line1, city, state, zip },
  });

  return NextResponse.json(address, { status: 201 });
}

/** PATCH /api/org/customers/:id/addresses — update address */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireOrgUser(["DISPATCHER", "ORG_ADMIN"], true);
  if (user instanceof Response) return user;

  await params; // consume params (customerId used for org-scoping context)
  const body = await req.json();
  const { addressId, line1, line2, city, state, zip } = body;

  if (!addressId) {
    return NextResponse.json({ error: "addressId is required" }, { status: 400 });
  }

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  // Fetch existing address
  const existing = await t.findUnique("address", { where: { id: addressId } }) as {
    id: string; line1: string; line2: string | null; city: string; state: string; zip: string;
    lat: number | null; lng: number | null;
  } | null;

  if (!existing) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};

  const fields = { line1, line2, city, state, zip } as Record<string, string | undefined>;
  for (const [key, val] of Object.entries(fields)) {
    if (val !== undefined) {
      const normalized = key === "line2" ? val || null : val;
      const existingVal = existing[key as keyof typeof existing];
      if (normalized !== existingVal) {
        data[key] = normalized;
        before[key] = existingVal;
        after[key] = normalized;
      }
    }
  }

  // Re-geocode if street address changed
  const addressChanged = "line1" in data || "city" in data || "state" in data || "zip" in data;
  if (addressChanged) {
    const coords = await geocode({
      line1: (data.line1 as string) ?? existing.line1,
      city: (data.city as string) ?? existing.city,
      state: (data.state as string) ?? existing.state,
      zip: (data.zip as string) ?? existing.zip,
    });
    data.lat = coords?.lat ?? null;
    data.lng = coords?.lng ?? null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(existing);
  }

  const updated = await t.update("address", {
    where: { id: addressId },
    data,
  });

  await auditLog({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "UPDATE",
    entity: "address",
    entityId: addressId,
    meta: { before, after } as Prisma.InputJsonValue,
  });

  return NextResponse.json(updated);
}

/** DELETE /api/org/customers/:id/addresses — delete address */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireOrgUser(["DISPATCHER", "ORG_ADMIN"], true);
  if (user instanceof Response) return user;

  await params;
  const { searchParams } = new URL(req.url);
  const addressId = searchParams.get("addressId");

  if (!addressId) {
    return NextResponse.json({ error: "addressId query param required" }, { status: 400 });
  }

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  // Check address exists
  const address = await t.findUnique("address", { where: { id: addressId } }) as {
    id: string; line1: string; city: string;
  } | null;
  if (!address) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  // Safety: don't delete if tied to an active job
  const activeJobCount = await t.count("job", {
    where: {
      addressId,
      status: { notIn: ["COMPLETED", "CANCELED"] },
    },
  });

  if (activeJobCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete address tied to an active job" },
      { status: 409 }
    );
  }

  await t.delete("address", { where: { id: addressId } });

  await auditLog({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "DELETE",
    entity: "address",
    entityId: addressId,
    meta: { line1: address.line1, city: address.city },
  });

  return NextResponse.json({ ok: true });
}
