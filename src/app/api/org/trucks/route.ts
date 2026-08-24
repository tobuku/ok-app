import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { tenantScope } from "@/lib/tenant";

/** GET /api/org/trucks — list org trucks */
export async function GET() {
  const user = await requireOrgUser(["DISPATCHER", "ORG_ADMIN"]);
  if (user instanceof Response) return user;

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });
  const trucks = await t.findMany("truck", {
    where: { active: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(trucks);
}

/** POST /api/org/trucks — create truck (Dispatcher, Org Admin) */
export async function POST(req: NextRequest) {
  const user = await requireOrgUser(["DISPATCHER", "ORG_ADMIN"], true);
  if (user instanceof Response) return user;

  const body = await req.json();
  const { name, capacityCubicYards } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });
  const truck = await t.create("truck", {
    data: {
      name: name.trim(),
      capacityCubicYards: capacityCubicYards ?? null,
    },
  });

  return NextResponse.json(truck, { status: 201 });
}
