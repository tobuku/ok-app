/**
 * GET /api/org/reports/daily-summary — Leadman daily summary
 * Returns: jobs completed, revenue collected, photos taken, time on site.
 */
import { NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { tenantScope } from "@/lib/tenant";
import { getOrgToday } from "@/lib/date-utils";

export async function GET() {
  const userOrRes = await requireOrgUser(["LEADMAN", "DISPATCHER", "ORG_ADMIN"], true);
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes;

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  const { start, end } = getOrgToday(user.timezone);

  // Jobs completed today by this user
  const completedJobs = await t.findMany<{
    id: string;
    onSiteAt: Date | null;
    completedAt: Date | null;
  }>("job", {
    where: {
      assignedToId: user.id,
      completedAt: { gte: start, lte: end },
    },
    select: { id: true, onSiteAt: true, completedAt: true },
  });

  // Revenue: payments received today by this user
  const payments = await t.findMany<{
    amountCents: number;
  }>("payment", {
    where: {
      receivedById: user.id,
      status: "SUCCEEDED",
      paidAt: { gte: start, lte: end },
    },
    select: { amountCents: true },
  });

  // Photos taken today by this user
  const photos = await t.findMany<{ id: string }>("photo", {
    where: {
      takenById: user.id,
      takenAt: { gte: start, lte: end },
    },
    select: { id: true },
  });

  // Calculate total on-site minutes
  let totalMinutesOnSite = 0;
  for (const job of completedJobs) {
    if (job.onSiteAt && job.completedAt) {
      const diff = new Date(job.completedAt).getTime() - new Date(job.onSiteAt).getTime();
      totalMinutesOnSite += Math.max(0, Math.round(diff / 60000));
    }
  }

  const totalRevenueCents = payments.reduce((s, p) => s + p.amountCents, 0);

  return NextResponse.json({
    jobsCompleted: completedJobs.length,
    totalRevenueCents,
    photosCount: photos.length,
    totalMinutesOnSite,
  });
}
