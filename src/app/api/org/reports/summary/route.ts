import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/org/reports/summary — org dashboard metrics */
export async function GET(req: NextRequest) {
  const user = await requireOrgUser(["ORG_ADMIN"]);
  if (user instanceof Response) return user;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // Default to current month
  const now = new Date();
  const startDate = from
    ? new Date(from + "T00:00:00")
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = to
    ? new Date(to + "T23:59:59.999")
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const orgId = user.orgId;

  // Run all queries in parallel
  const [
    jobsByStatus,
    totalRevenue,
    paymentsByMethod,
    quotesCreated,
    quotesAccepted,
    quotesDeclined,
    dumpCosts,
    jobsByLeadman,
  ] = await Promise.all([
    // Jobs by status (all time for the org)
    prisma.job.groupBy({
      by: ["status"],
      where: { orgId },
      _count: { id: true },
    }),

    // Revenue in period (succeeded payments)
    prisma.payment.aggregate({
      where: {
        orgId,
        status: "SUCCEEDED",
        paidAt: { gte: startDate, lte: endDate },
      },
      _sum: { amountCents: true },
      _count: { id: true },
    }),

    // Payments by method in period
    prisma.payment.groupBy({
      by: ["method"],
      where: {
        orgId,
        status: "SUCCEEDED",
        paidAt: { gte: startDate, lte: endDate },
      },
      _sum: { amountCents: true },
      _count: { id: true },
    }),

    // Quotes created in period
    prisma.quote.count({
      where: {
        orgId,
        createdAt: { gte: startDate, lte: endDate },
      },
    }),

    // Quotes accepted in period
    prisma.quote.count({
      where: {
        orgId,
        status: "ACCEPTED",
        acceptedAt: { gte: startDate, lte: endDate },
      },
    }),

    // Quotes declined in period
    prisma.quote.count({
      where: {
        orgId,
        status: "DECLINED",
        updatedAt: { gte: startDate, lte: endDate },
      },
    }),

    // Dump costs in period
    prisma.dumpRun.aggregate({
      where: {
        orgId,
        runAt: { gte: startDate, lte: endDate },
      },
      _sum: { feeCents: true },
      _count: { id: true },
    }),

    // Jobs completed per leadman in period
    prisma.job.groupBy({
      by: ["assignedToId"],
      where: {
        orgId,
        status: { in: ["COMPLETED", "PAID"] },
        completedAt: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
    }),
  ]);

  // Enrich leadman stats with names
  const leadmanIds = jobsByLeadman
    .map((j) => j.assignedToId)
    .filter(Boolean) as string[];
  const leadmen = leadmanIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: leadmanIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameMap = Object.fromEntries(leadmen.map((u) => [u.id, u.name]));

  const conversionRate =
    quotesCreated > 0
      ? Math.round((quotesAccepted / quotesCreated) * 100)
      : 0;

  return NextResponse.json({
    period: { from: startDate.toISOString(), to: endDate.toISOString() },
    jobsByStatus: Object.fromEntries(
      jobsByStatus.map((g) => [g.status, g._count.id])
    ),
    revenue: {
      totalCents: totalRevenue._sum.amountCents ?? 0,
      count: totalRevenue._count.id,
    },
    paymentsByMethod: paymentsByMethod.map((p) => ({
      method: p.method,
      totalCents: p._sum.amountCents ?? 0,
      count: p._count.id,
    })),
    quotes: {
      created: quotesCreated,
      accepted: quotesAccepted,
      declined: quotesDeclined,
      conversionRate,
    },
    dumpCosts: {
      totalCents: dumpCosts._sum.feeCents ?? 0,
      runCount: dumpCosts._count.id,
    },
    leadmanPerformance: jobsByLeadman.map((j) => ({
      userId: j.assignedToId,
      name: j.assignedToId ? nameMap[j.assignedToId] ?? "Unknown" : "Unassigned",
      jobsCompleted: j._count.id,
    })),
  });
}
