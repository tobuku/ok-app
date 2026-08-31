import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { tenantScope } from "@/lib/tenant";
import { dateToDayBounds } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

/** GET /api/org/jobs — list jobs. Leadman sees only assigned; Dispatcher/Admin see all. */
export async function GET(req: NextRequest) {
  const user = await requireOrgUser(["LEADMAN", "DISPATCHER", "ORG_ADMIN"]);
  if (user instanceof Response) return user;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const date = searchParams.get("date"); // YYYY-MM-DD
  const assignedTo = searchParams.get("assignedTo");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (assignedTo) where.assignedToId = assignedTo;
  if (user.role === "LEADMAN") where.assignedToId = user.id;

  if (date) {
    const { start, end } = dateToDayBounds(date, user.timezone);
    where.scheduledDate = { gte: start, lte: end };
  }

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });
  const jobs = await t.findMany("job", {
    where,
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      assignedTo: { select: { id: true, name: true } },
      address: true,
    },
    orderBy: { scheduledDate: "asc" },
  });

  return NextResponse.json(jobs);
}

/** POST /api/org/jobs — create a job (Dispatcher, Org Admin) */
export async function POST(req: NextRequest) {
  const user = await requireOrgUser(["DISPATCHER", "ORG_ADMIN"], true);
  if (user instanceof Response) return user;

  const body = await req.json();
  const { customerId, addressId, scheduledDate, timeWindowStart, timeWindowEnd, assignedToId, truckId, notes, source } = body;

  if (!customerId) {
    return NextResponse.json({ error: "customerId is required" }, { status: 400 });
  }

  // Verify customer belongs to this org
  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });
  const customer = await t.findUnique("customer", { where: { id: customerId } });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Generate next job number for this org
  const maxJob = await prisma.job.findFirst({
    where: { orgId: user.orgId },
    orderBy: { jobNumber: "desc" },
    select: { jobNumber: true },
  });
  const jobNumber = (maxJob?.jobNumber ?? 1000) + 1;

  const job = await t.create("job", {
    data: {
      jobNumber,
      customerId,
      addressId: addressId || null,
      status: scheduledDate ? "SCHEDULED" : "NEW",
      scheduledDate: scheduledDate ? dateToDayBounds(scheduledDate, user.timezone).start : null,
      timeWindowStart: timeWindowStart ? new Date(timeWindowStart) : null,
      timeWindowEnd: timeWindowEnd ? new Date(timeWindowEnd) : null,
      assignedToId: assignedToId || null,
      truckId: truckId || null,
      notes: notes || null,
      source: source || "PHONE",
      createdById: user.id,
    },
  });

  return NextResponse.json(job, { status: 201 });
}
