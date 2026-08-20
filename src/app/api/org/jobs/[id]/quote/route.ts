/**
 * POST /api/org/jobs/:id/quote — Create or update a quote with line items
 * GET  /api/org/jobs/:id/quote — Get the latest quote for a job
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { tenantScope } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const userOrRes = await requireOrgUser(["LEADMAN", "ORG_ADMIN"], true);
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes;

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  // Verify job exists and is in a quoteable state
  const job = await t.findFirst<{ id: string; status: string }>("job", {
    where: { id: jobId },
    select: { id: true, status: true },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.status !== "ON_SITE" && job.status !== "QUOTED" && job.status !== "DECLINED") {
    return NextResponse.json(
      { error: `Cannot create quote in status ${job.status}` },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { lines, discountCents = 0, discountReason } = body;

  if (!Array.isArray(lines) || lines.length === 0) {
    return NextResponse.json({ error: "lines[] required" }, { status: 400 });
  }

  // Calculate totals
  const subtotalCents = lines.reduce(
    (sum: number, l: { qty: number; unitCents: number }) => sum + l.qty * l.unitCents,
    0
  );

  // Get org tax rate
  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: { taxRateBps: true },
  });
  const taxableAmount = subtotalCents - discountCents;
  const taxCents = Math.round((taxableAmount * (org?.taxRateBps ?? 0)) / 10000);
  const totalCents = taxableAmount + taxCents;

  // Create quote + lines in a transaction
  const quote = await prisma.$transaction(async (tx) => {
    const q = await tx.quote.create({
      data: {
        orgId: user.orgId,
        jobId,
        status: "DRAFT",
        subtotalCents,
        discountCents,
        discountReason: discountReason || null,
        taxCents,
        totalCents,
      },
    });

    for (const line of lines) {
      await tx.quoteLine.create({
        data: {
          orgId: user.orgId,
          quoteId: q.id,
          priceItemId: line.priceItemId || null,
          label: line.label,
          qty: line.qty ?? 1,
          unitCents: line.unitCents,
          totalCents: (line.qty ?? 1) * line.unitCents,
        },
      });
    }

    // Transition job to QUOTED if it's ON_SITE or DECLINED
    if (job.status === "ON_SITE" || job.status === "DECLINED") {
      await tx.job.update({
        where: { id: jobId },
        data: { status: "QUOTED" },
      });
    }

    return q;
  });

  // Audit log (quote was created in transaction, so log manually)
  const { auditLog } = await import("@/lib/audit");
  await auditLog({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "CREATE",
    entity: "quote",
    entityId: quote.id,
    meta: { jobId, totalCents },
  });

  return NextResponse.json({ quote });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const userOrRes = await requireOrgUser(["LEADMAN", "DISPATCHER", "ORG_ADMIN"]);
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes;

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  // Get the latest quote for this job
  const quotes = await t.findMany<{
    id: string;
    status: string;
    subtotalCents: number;
    discountCents: number;
    discountReason: string | null;
    taxCents: number;
    totalCents: number;
    createdAt: string;
  }>("quote", {
    where: { jobId },
    orderBy: { createdAt: "desc" },
    take: 1,
    include: {
      lines: {
        include: { priceItem: true },
      },
    },
  });

  const quote = quotes[0] ?? null;
  return NextResponse.json({ quote });
}
