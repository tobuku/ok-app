import { NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/org/users — list org users (for assignment dropdowns etc.) */
export async function GET() {
  const user = await requireOrgUser(["LEADMAN", "DISPATCHER", "ORG_ADMIN"]);
  if (user instanceof Response) return user;

  const users = await prisma.user.findMany({
    where: { orgId: user.orgId, active: true },
    select: { id: true, name: true, role: true, email: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}
