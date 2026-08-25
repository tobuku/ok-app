import { NextRequest, NextResponse } from "next/server";
import { constructBillingWebhookEvent } from "@/lib/stripe-billing";
import { prisma } from "@/lib/prisma";
import type { Stripe } from "stripe";

/**
 * POST /api/webhooks/stripe-billing
 * Handles subscription lifecycle events → updates Organization.status.
 *
 * Events:
 * - customer.subscription.created → TRIALING or ACTIVE
 * - customer.subscription.updated → ACTIVE, PAST_DUE, CANCELED, etc.
 * - customer.subscription.deleted → CANCELED
 * - customer.subscription.trial_will_end → (optional: send reminder email)
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = constructBillingWebhookEvent(rawBody, sig);
  } catch (err) {
    console.error("Billing webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscription = event.data.object as Stripe.Subscription & { current_period_end?: number };
  const orgId = subscription.metadata?.orgId;

  if (!orgId) {
    console.warn("Billing webhook: no orgId in subscription metadata", subscription.id);
    return NextResponse.json({ received: true });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const stripeStatus = subscription.status;
      const orgStatus = mapStripeStatus(stripeStatus);

      await prisma.organization.update({
        where: { id: orgId },
        data: { status: orgStatus },
      });

      // Update subscription record
      await prisma.subscription.upsert({
        where: { orgId },
        update: {
          stripeSubscriptionId: subscription.id,
          status: stripeStatus,
          currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
        },
        create: {
          orgId,
          planId: await resolvePlanId(subscription),
          stripeSubscriptionId: subscription.id,
          status: stripeStatus,
          currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
        },
      });

      break;
    }

    case "customer.subscription.deleted": {
      await prisma.organization.update({
        where: { id: orgId },
        data: { status: "CANCELED" },
      });

      await prisma.subscription.updateMany({
        where: { orgId },
        data: { status: "canceled" },
      });

      break;
    }

    case "customer.subscription.trial_will_end": {
      // Trial ending in 3 days — could send reminder email here
      console.log(`Trial ending soon for org ${orgId}`);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

function mapStripeStatus(stripeStatus: string): "TRIALING" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELED" {
  switch (stripeStatus) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "unpaid":
    case "incomplete_expired":
      return "SUSPENDED";
    case "canceled":
      return "CANCELED";
    case "incomplete":
      return "TRIALING"; // still setting up
    default:
      return "ACTIVE";
  }
}

async function resolvePlanId(subscription: Stripe.Subscription): Promise<string> {
  // Try to find plan by Stripe price ID, fall back to first active plan
  const priceId = subscription.items.data[0]?.price?.id;
  if (priceId) {
    const plan = await prisma.plan.findFirst({
      where: { features: { path: ["stripePriceId"], equals: priceId } },
    });
    if (plan) return plan.id;
  }

  // Fallback: first active plan
  const fallback = await prisma.plan.findFirst({ where: { active: true } });
  return fallback?.id ?? "plan_starter";
}
