/**
 * POST /api/webhooks/stripe-connect — Stripe Connect webhook
 * Handles checkout.session.completed events from connected accounts.
 * Transitions job to PAID, sends receipt email.
 *
 * No auth — verified via Stripe webhook signature.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { constructConnectWebhookEvent } from "@/lib/stripe-connect";
import { auditLog } from "@/lib/audit";
import { sendReceipt } from "@/lib/email";
import { getSignedUrl } from "@/lib/storage";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = constructConnectWebhookEvent(rawBody, signature);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { orgId, jobId, quoteId, receivedById } = session.metadata || {};

    if (!orgId || !jobId || !quoteId) {
      console.error("Missing metadata in checkout session:", session.id);
      return NextResponse.json({ received: true });
    }

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;

    const now = new Date();

    // Update payment record + transition job
    await prisma.$transaction(async (tx) => {
      // Find the pending payment by stripeSessionId
      const payment = await tx.payment.findFirst({
        where: { stripeSessionId: session.id, orgId },
      });

      if (payment) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCEEDED",
            stripePaymentIntentId: paymentIntentId,
            applicationFeeCents: session.total_details?.amount_discount
              ? undefined
              : undefined,
            paidAt: now,
          },
        });
      } else {
        // Payment record not found — create one (edge case: webhook before response)
        await tx.payment.create({
          data: {
            orgId,
            jobId,
            quoteId,
            method: "CARD",
            status: "SUCCEEDED",
            amountCents: session.amount_total ?? 0,
            stripeSessionId: session.id,
            stripePaymentIntentId: paymentIntentId,
            receivedById: receivedById || "",
            paidAt: now,
          },
        });
      }

      // Transition job to PAID (payment before loading — job is in ACCEPTED status)
      const job = await tx.job.findUnique({
        where: { id: jobId },
        select: { status: true },
      });
      if (job && job.status === "ACCEPTED") {
        await tx.job.update({
          where: { id: jobId },
          data: { status: "PAID" },
        });
      }
    });

    await auditLog({
      orgId,
      action: "PAYMENT_CARD_COMPLETED",
      entity: "job",
      entityId: jobId,
      meta: { sessionId: session.id, paymentIntentId },
    });

    // Send receipt email
    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, orgId },
      include: { lines: true },
    });
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { jobNumber: true },
    });
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, logoKey: true, receiptsEmail: true },
    });

    if (quote?.customerEmail && job && org) {
      let logoUrl: string | null = null;
      if (org.logoKey) {
        logoUrl = await getSignedUrl(org.logoKey);
      }

      sendReceipt({
        orgId,
        jobId,
        orgName: org.name,
        orgLogoUrl: logoUrl,
        receiptsEmail: org.receiptsEmail,
        customerEmail: quote.customerEmail,
        jobNumber: job.jobNumber,
        lines: quote.lines.map((l) => ({
          label: l.label,
          qty: l.qty,
          totalCents: l.totalCents,
        })),
        subtotalCents: quote.subtotalCents,
        discountCents: quote.discountCents,
        discountReason: quote.discountReason,
        taxCents: quote.taxCents,
        totalCents: quote.totalCents,
        paymentMethod: "CARD",
        paidAt: now,
      }).catch((err) => console.error("Receipt email failed:", err));
    }
  }

  return NextResponse.json({ received: true });
}
