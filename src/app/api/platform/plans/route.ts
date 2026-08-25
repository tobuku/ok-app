import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/platform/plans — list all plans */
export async function GET() {
  const admin = await requirePlatformAdmin();
  if (admin instanceof Response) return admin;

  const plans = await prisma.plan.findMany({
    orderBy: { priceCentsMonthly: "asc" },
  });

  return NextResponse.json(plans);
}

/** PATCH /api/platform/plans — update a plan */
export async function PATCH(req: NextRequest) {
  const admin = await requirePlatformAdmin();
  if (admin instanceof Response) return admin;

  const body = await req.json();
  const { id, name, priceCentsMonthly, maxUsers, maxJobsPerMonth, features, active } = body;

  if (!id) {
    return NextResponse.json({ error: "Plan id is required" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (priceCentsMonthly !== undefined) data.priceCentsMonthly = priceCentsMonthly;
  if (maxUsers !== undefined) data.maxUsers = maxUsers;
  if (maxJobsPerMonth !== undefined) data.maxJobsPerMonth = maxJobsPerMonth;
  if (features !== undefined) data.features = features;
  if (active !== undefined) data.active = active;

  const updated = await prisma.plan.update({ where: { id }, data });
  return NextResponse.json(updated);
}
