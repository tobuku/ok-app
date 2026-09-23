/**
 * POST /api/org/jobs/:id/pay/cash — Record a cash or check payment
 * Leadman or Org Admin. Job must be ACCEPTED (pay before loading).
 * Transitions job to PAID. Creates Payment record + sends receipt email.
 * Body: { amountCents?: number, method?: "CASH" | "CHECK" }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { tenantScope } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { assertTransition } from "@/lib/status";
import { auditLog } from "@/lib/audit";
import { sendReceipt } from "@/lib/email";
import { getSignedUrl } from "@/lib/storage";
import { createAndSendReviewRequest } from "@/lib/review";
import { randomBytes } from "crypto";
import type { JobStatus } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const userOrRes = await requireOrgUser(["LEADMAN", "ORG_ADMIN"], true);
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes;

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  // Load job with accepted quote
  const job = await t.findFirst<{
    id: string;
    jobNumber: number;
    status: JobStatus;
    customerId: string;
  }>("job", {
    where: { id: jobId },
    select: { id: true, jobNumber: true, status: true, customerId: true },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  assertTransition(job.status, "PAID");

  // Get the accepted quote
  const quote = await t.findFirst<{
    id: string;
    totalCents: number;
    subtotalCents: number;
    discountCents: number;
    discountReason: string | null;
    taxCents: number;
    customerEmail: string | null;
  }>("quote", {
    where: { jobId, status: "ACCEPTED" },
  });
  if (!quote) {
    return NextResponse.json(
      { error: "No accepted quote found" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const amountCents =
    typeof body.amountCents === "number" ? body.amountCents : quote.totalCents;
  const method: "CASH" | "CHECK" =
    body.method === "CHECK" ? "CHECK" : "CASH";

  const now = new Date();

  // Create payment + transition job in one transaction
  const payment = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: {
        orgId: user.orgId,
        jobId,
        quoteId: quote.id,
        method,
        status: "SUCCEEDED",
        amountCents,
        receiptToken: randomBytes(24).toString("base64url"),
        receivedById: user.id,
        paidAt: now,
      },
    });

    await tx.job.update({
      where: { id: jobId },
      data: { status: "PAID" },
    });

    return p;
  });

  await auditLog({
    orgId: user.orgId,
    actorUserId: user.id,
    action: method === "CHECK" ? "PAYMENT_CHECK" : "PAYMENT_CASH",
    entity: "payment",
    entityId: payment.id,
    meta: { jobId, amountCents, method },
  });

  // Send receipt email if customer email is available
  if (quote.customerEmail) {
    const org = await prisma.organization.findUnique({
      where: { id: user.orgId },
      select: { name: true, logoKey: true, receiptsEmail: true, senderEmail: true, googlePlaceId: true, reviewEnabled: true },
    });

    const lines = await t.findMany<{
      label: string;
      qty: number;
      totalCents: number;
    }>("quoteLine", {
      where: { quoteId: quote.id },
    });

    let logoUrl: string | null = null;
    if (org?.logoKey) {
      logoUrl = await getSignedUrl(org.logoKey);
    }

    sendReceipt({
      receiptToken: payment.receiptToken,
      orgId: user.orgId,
      jobId,
      orgName: org?.name ?? "Service Provider",
      orgLogoUrl: logoUrl,
      senderEmail: org?.senderEmail,
      receiptsEmail: org?.receiptsEmail,
      customerEmail: quote.customerEmail,
      jobNumber: job.jobNumber,
      lines,
      subtotalCents: quote.subtotalCents,
      discountCents: quote.discountCents,
      discountReason: quote.discountReason,
      taxCents: quote.taxCents,
      totalCents: quote.totalCents,
      paymentMethod: method,
      paidAt: now,
    }).catch((err) => console.error("Receipt email failed:", err));

    // Send review request (fire-and-forget, never blocks payment)
    createAndSendReviewRequest({
      orgId: user.orgId,
      jobId,
      customerId: job.customerId,
      customerEmail: quote.customerEmail,
      orgName: org?.name ?? "Service Provider",
      orgLogoUrl: logoUrl,
      receiptsEmail: org?.receiptsEmail,
      googlePlaceId: org?.googlePlaceId,
      reviewEnabled: org?.reviewEnabled ?? false,
      actorUserId: user.id,
    }).catch((err) => console.error("Review request failed:", err));
  }

  return NextResponse.json({ payment: { id: payment.id, status: "SUCCEEDED" } });
}
