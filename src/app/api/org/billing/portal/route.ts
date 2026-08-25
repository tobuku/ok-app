import { NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBillingPortalSession } from "@/lib/stripe-billing";

/** POST /api/org/billing/portal — get Stripe Customer Portal link */
export async function POST() {
  const user = await requireOrgUser(["ORG_ADMIN"]);
  if (user instanceof Response) return user;

  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: { stripeCustomerId: true },
  });

  if (!org?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing account found. Subscribe to a plan first." },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = await createBillingPortalSession({
    customerId: org.stripeCustomerId,
    returnUrl: `${appUrl}/app/settings/billing`,
  });

  return NextResponse.json({ url });
}
