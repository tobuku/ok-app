import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BillingManager } from "./billing-manager";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const result = await resolveAuth();
  if (!result.ok) redirect("/login");
  if (!("user" in result)) redirect("/platform");
  const { user } = result;

  if (user.role !== "ORG_ADMIN") redirect("/app");

  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: {
      name: true,
      status: true,
      trialEndsAt: true,
      stripeCustomerId: true,
      subscription: {
        include: { plan: true },
      },
    },
  });

  if (!org) redirect("/app");

  // Load available plans for subscription
  const plans = await prisma.plan.findMany({
    where: { active: true },
    orderBy: { priceCentsMonthly: "asc" },
  });

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Billing & Subscription</h1>
      <BillingManager
        orgName={org.name}
        orgStatus={org.status}
        trialEndsAt={org.trialEndsAt?.toISOString() ?? null}
        hasStripeCustomer={!!org.stripeCustomerId}
        subscription={org.subscription ? {
          planName: org.subscription.plan.name,
          status: org.subscription.status,
          currentPeriodEnd: org.subscription.currentPeriodEnd?.toISOString() ?? null,
        } : null}
        plans={plans.map((p) => ({
          id: p.id,
          name: p.name,
          priceCentsMonthly: p.priceCentsMonthly,
          maxUsers: p.maxUsers,
          maxJobsPerMonth: p.maxJobsPerMonth,
          hasStripePrice: !!(p.features as Record<string, unknown>)?.stripePriceId,
        }))}
      />
    </div>
  );
}
