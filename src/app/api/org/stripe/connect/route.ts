/**
 * POST /api/org/stripe/connect — Generate Stripe Connect onboarding link
 * Org Admin only. Creates a Standard connected account if needed.
 * GET  /api/org/stripe/connect — Check connection status
 */
import { NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import {
  createConnectOnboardingLink,
  isConnectAccountReady,
} from "@/lib/stripe-connect";

export async function POST() {
  const userOrRes = await requireOrgUser(["ORG_ADMIN"], true);
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes;

  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: { name: true, stripeConnectAccountId: true },
  });
  if (!org) {
    return NextResponse.json({ error: "Org not found" }, { status: 404 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const { accountId, url } = await createConnectOnboardingLink({
    orgId: user.orgId,
    existingAccountId: org.stripeConnectAccountId,
    orgName: org.name,
    returnUrl: `${baseUrl}/app/settings/stripe?status=complete`,
    refreshUrl: `${baseUrl}/app/settings/stripe?status=refresh`,
  });

  // Save the account ID if newly created
  if (!org.stripeConnectAccountId) {
    await prisma.organization.update({
      where: { id: user.orgId },
      data: { stripeConnectAccountId: accountId },
    });

    await auditLog({
      orgId: user.orgId,
      actorUserId: user.id,
      action: "STRIPE_CONNECT_INIT",
      entity: "organization",
      entityId: user.orgId,
      meta: { accountId },
    });
  }

  return NextResponse.json({ url });
}

export async function GET() {
  const userOrRes = await requireOrgUser(["ORG_ADMIN", "DISPATCHER", "LEADMAN"]);
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes;

  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: { stripeConnectAccountId: true },
  });

  if (!org?.stripeConnectAccountId) {
    return NextResponse.json({ connected: false, chargesEnabled: false });
  }

  const chargesEnabled = await isConnectAccountReady(
    org.stripeConnectAccountId
  );

  return NextResponse.json({
    connected: true,
    chargesEnabled,
    accountId: org.stripeConnectAccountId,
  });
}
