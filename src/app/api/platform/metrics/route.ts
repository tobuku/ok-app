import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/platform/metrics — platform-wide MRR, active orgs, jobs volume */
export async function GET() {
  const admin = await requirePlatformAdmin();
  if (admin instanceof Response) return admin;

  const [
    orgsByStatus,
    totalUsers,
    totalJobs,
    plans,
    subscriptions,
  ] = await Promise.all([
    prisma.organization.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.user.count({ where: { active: true } }),
    prisma.job.count(),
    prisma.plan.findMany({ where: { active: true } }),
    prisma.subscription.findMany({
      where: { status: { in: ["active", "trialing"] } },
      include: { plan: { select: { priceCentsMonthly: true } } },
    }),
  ]);

  // Calculate MRR from active subscriptions (trialing counts as future MRR)
  const mrrCents = subscriptions.reduce(
    (sum, sub) => sum + sub.plan.priceCentsMonthly,
    0
  );

  const activeOrgs = orgsByStatus.find((o) => o.status === "ACTIVE")?._count.id ?? 0;
  const trialingOrgs = orgsByStatus.find((o) => o.status === "TRIALING")?._count.id ?? 0;

  return NextResponse.json({
    mrrCents,
    orgsByStatus: Object.fromEntries(orgsByStatus.map((o) => [o.status, o._count.id])),
    activeOrgs,
    trialingOrgs,
    totalOrgs: orgsByStatus.reduce((sum, o) => sum + o._count.id, 0),
    totalUsers,
    totalJobs,
    plans: plans.map((p) => ({ id: p.id, name: p.name, priceCentsMonthly: p.priceCentsMonthly })),
  });
}
