import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBillingCheckoutSession, createBillingCustomer } from "@/lib/stripe-billing";

/** POST /api/org/billing/checkout — start subscription checkout */
export async function POST(req: NextRequest) {
  const user = await requireOrgUser(["ORG_ADMIN"], true);
  if (user instanceof Response) return user;

  const body = await req.json();
  const { planId } = body;

  if (!planId) {
    return NextResponse.json({ error: "planId is required" }, { status: 400 });
  }

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.active) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const stripePriceId = (plan.features as Record<string, unknown>)?.stripePriceId as string | undefined;
  if (!stripePriceId) {
    return NextResponse.json(
      { error: "Plan not configured for billing (missing Stripe Price ID)" },
      { status: 400 }
    );
  }

  // Get or create Stripe customer for this org
  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: { stripeCustomerId: true, name: true },
  });

  let customerId = org?.stripeCustomerId;
  if (!customerId) {
    customerId = await createBillingCustomer({
      orgId: user.orgId,
      orgName: org?.name ?? "Organization",
      email: user.email,
    });
    await prisma.organization.update({
      where: { id: user.orgId },
      data: { stripeCustomerId: customerId },
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { url } = await createBillingCheckoutSession({
    customerId,
    priceId: stripePriceId,
    orgId: user.orgId,
    successUrl: `${appUrl}/app/settings/billing?status=success`,
    cancelUrl: `${appUrl}/app/settings/billing?status=canceled`,
  });

  return NextResponse.json({ url });
}
