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
import { createAndSendReviewRequest } from "@/lib/review";
import { randomBytes } from "crypto";

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

  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    // Mark pending payment as failed so the leadman's polling stops
    if (session.id) {
      const payment = await prisma.payment.findFirst({
        where: { stripeSessionId: session.id, status: "PENDING" },
      });
      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        });
        await auditLog({
          orgId: payment.orgId,
          action: "PAYMENT_CARD_EXPIRED",
          entity: "job",
          entityId: payment.jobId,
          meta: { sessionId: session.id },
        });
      }
    }
    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { orgId, jobId, quoteId, receivedById } = session.metadata || {};

    const payerEmail = session.customer_details?.email ?? null;

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
    const receiptTokenResult = await prisma.$transaction(async (tx) => {
      // Find the pending payment by stripeSessionId
      const payment = await tx.payment.findFirst({
        where: { stripeSessionId: session.id, orgId },
      });

      const receiptToken = randomBytes(24).toString("base64url");

      if (payment) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCEEDED",
            stripePaymentIntentId: paymentIntentId,
            receiptToken: payment.receiptToken ?? receiptToken,
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
            receiptToken,
            receivedById: receivedById || "",
            paidAt: now,
          },
        });
      }

      // Transition job to PAID from any valid pre-PAID status.
      // The leadman may have moved the job forward (e.g. IN_PROGRESS) before
      // the webhook arrived — in that case we leave the status as-is.
      const job = await tx.job.findUnique({
        where: { id: jobId },
        select: { status: true },
      });
      if (job && (job.status === "ACCEPTED" || job.status === "QUOTED")) {
        await tx.job.update({
          where: { id: jobId },
          data: { status: "PAID" },
        });
      }

      return payment?.receiptToken ?? receiptToken;
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
      select: { jobNumber: true, customerId: true },
    });
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, logoKey: true, receiptsEmail: true, senderEmail: true, googlePlaceId: true, reviewEnabled: true },
    });

    if (quote && job && org && (quote.customerEmail || org.receiptsEmail)) {
      let logoUrl: string | null = null;
      if (org.logoKey) {
        logoUrl = await getSignedUrl(org.logoKey);
      }

      let signatureUrl: string | null = null;
      if (quote.signatureKey) {
        signatureUrl = await getSignedUrl(quote.signatureKey).catch(() => null);
      }

      sendReceipt({
        receiptToken: receiptTokenResult,
        orgId,
        jobId,
        orgName: org.name,
        orgLogoUrl: logoUrl,
        senderEmail: org.senderEmail,
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
        signatureUrl,
        acceptedAt: quote.acceptedAt,
      }).catch((err) => console.error("Receipt email failed:", err));

      // Send receipt to actual payer if different from customer email
      if (payerEmail && payerEmail !== quote.customerEmail) {
        sendReceipt({
          receiptToken: receiptTokenResult,
          orgId,
          jobId,
          orgName: org.name,
          orgLogoUrl: logoUrl,
          senderEmail: org.senderEmail,
          receiptsEmail: null,
          customerEmail: payerEmail,
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
          signatureUrl,
          acceptedAt: quote.acceptedAt,
        }).catch((err) => console.error("Payer receipt failed:", err));
      }

      // Send review request (fire-and-forget, never blocks payment)
      if (quote.customerEmail) {
        createAndSendReviewRequest({
          orgId,
          jobId,
          customerId: job.customerId,
          customerEmail: quote.customerEmail,
          orgName: org.name,
          orgLogoUrl: logoUrl,
          receiptsEmail: org.receiptsEmail,
          googlePlaceId: org.googlePlaceId,
          reviewEnabled: org.reviewEnabled,
        }).catch((err) => console.error("Review request failed:", err));
      }
    }
  }

  return NextResponse.json({ received: true });
}
