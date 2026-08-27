/**
 * POST /api/org/jobs/:id/pay/card — Create a Stripe Checkout Session
 * on the tenant's connected Stripe account.
 * Leadman or Org Admin. Job must be ACCEPTED (pay before loading).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { tenantScope } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { createCheckoutSession } from "@/lib/stripe-connect";
import type { JobStatus } from "@prisma/client";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const userOrRes = await requireOrgUser(["LEADMAN", "ORG_ADMIN"], true);
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes;

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  // Load job
  const job = await t.findFirst<{
    id: string;
    jobNumber: number;
    status: JobStatus;
  }>("job", {
    where: { id: jobId },
    select: { id: true, jobNumber: true, status: true },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status !== "ACCEPTED") {
    return NextResponse.json(
      { error: `Cannot collect payment in status ${job.status}` },
      { status: 400 }
    );
  }

  // Get accepted quote
  const quote = await t.findFirst<{
    id: string;
    totalCents: number;
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

  // Check org has Stripe Connect
  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: { name: true, stripeConnectAccountId: true },
  });
  if (!org?.stripeConnectAccountId) {
    return NextResponse.json(
      { error: "Stripe not connected. Ask your admin to connect Stripe." },
      { status: 400 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const { sessionId, url } = await createCheckoutSession({
    connectedAccountId: org.stripeConnectAccountId,
    amountCents: quote.totalCents,
    orgName: org.name,
    jobNumber: job.jobNumber,
    customerEmail: quote.customerEmail,
    successUrl: `${baseUrl}/m/jobs/${jobId}?payment=success`,
    cancelUrl: `${baseUrl}/m/jobs/${jobId}?payment=canceled`,
    metadata: {
      orgId: user.orgId,
      jobId,
      quoteId: quote.id,
      receivedById: user.id,
    },
  });

  // Create a PENDING payment record
  const payment = await prisma.$transaction(async (tx) => {
    return tx.payment.create({
      data: {
        orgId: user.orgId,
        jobId,
        quoteId: quote.id,
        method: "CARD",
        status: "PENDING",
        amountCents: quote.totalCents,
        stripeSessionId: sessionId,
        receivedById: user.id,
      },
    });
  });

  await auditLog({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "PAYMENT_CARD_INIT",
    entity: "payment",
    entityId: payment.id,
    meta: { jobId, sessionId },
  });

  return NextResponse.json({ url, paymentId: payment.id });
}
