/**
 * POST /api/org/estimates — Field estimate creation (LEADMAN allowed)
 * Creates customer + address + job in one transaction.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { tenantScope } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { geocode } from "@/lib/geocode";

export async function POST(req: NextRequest) {
  const user = await requireOrgUser(["LEADMAN", "DISPATCHER", "ORG_ADMIN"], true);
  if (user instanceof Response) return user;

  const body = await req.json();
  const { customer, address } = body as {
    customer: { name: string; phone?: string; email?: string };
    address: { line1: string; line2?: string; city: string; state: string; zip: string };
  };

  if (!customer?.name) {
    return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
  }
  if (!address?.line1 || !address?.city || !address?.state || !address?.zip) {
    return NextResponse.json({ error: "Address line1, city, state, zip are required" }, { status: 400 });
  }

  // Geocode address (best-effort, won't block creation)
  const coords = await geocode({
    line1: address.line1,
    city: address.city,
    state: address.state,
    zip: address.zip,
  });

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  // Generate next job number
  const maxJob = await prisma.job.findFirst({
    where: { orgId: user.orgId },
    orderBy: { jobNumber: "desc" },
    select: { jobNumber: true },
  });
  const jobNumber = (maxJob?.jobNumber ?? 1000) + 1;

  // Create everything in one transaction
  const job = await prisma.$transaction(async (tx) => {
    const cust = await tx.customer.create({
      data: {
        orgId: user.orgId,
        name: customer.name,
        phone: customer.phone || null,
        email: customer.email || null,
      },
    });

    const addr = await tx.address.create({
      data: {
        orgId: user.orgId,
        customerId: cust.id,
        line1: address.line1,
        line2: address.line2 || null,
        city: address.city,
        state: address.state,
        zip: address.zip,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      },
    });

    const j = await tx.job.create({
      data: {
        orgId: user.orgId,
        jobNumber,
        customerId: cust.id,
        addressId: addr.id,
        status: "ESTIMATE",
        source: "FIELD_ESTIMATE",
        assignedToId: user.id,
        createdById: user.id,
        onSiteAt: new Date(),
      },
    });

    return j;
  });

  // Audit log
  const { auditLog } = await import("@/lib/audit");
  await auditLog({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "CREATE",
    entity: "job",
    entityId: job.id,
    meta: { source: "FIELD_ESTIMATE", jobNumber },
  });

  return NextResponse.json({ jobId: job.id });
}
