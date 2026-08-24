import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/org/jobs/map-data — jobs with lat/lng for map pins */
export async function GET(req: NextRequest) {
  const user = await requireOrgUser(["DISPATCHER", "ORG_ADMIN"]);
  if (user instanceof Response) return user;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const date = searchParams.get("date");

  const where: Record<string, unknown> = { orgId: user.orgId };
  if (status) where.status = status;
  if (date) {
    const start = new Date(date + "T00:00:00");
    const end = new Date(date + "T23:59:59.999");
    where.scheduledDate = { gte: start, lte: end };
  }

  const jobs = await prisma.job.findMany({
    where,
    select: {
      id: true,
      jobNumber: true,
      status: true,
      scheduledDate: true,
      notes: true,
      customer: { select: { name: true, phone: true } },
      address: { select: { line1: true, city: true, state: true, zip: true, lat: true, lng: true } },
      assignedTo: { select: { name: true } },
    },
    orderBy: { scheduledDate: "asc" },
  });

  // Only return jobs that have an address with lat/lng
  const withCoords = jobs.filter((j) => j.address?.lat != null && j.address?.lng != null);

  return NextResponse.json(withCoords);
}
