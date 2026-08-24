import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { tenantScope } from "@/lib/tenant";

/** GET /api/org/dumpsites — list dump sites */
export async function GET() {
  const user = await requireOrgUser(["DISPATCHER", "ORG_ADMIN"]);
  if (user instanceof Response) return user;

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });
  const sites = await t.findMany("dumpSite", {
    where: { active: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(sites);
}

/** POST /api/org/dumpsites — create dump site */
export async function POST(req: NextRequest) {
  const user = await requireOrgUser(["DISPATCHER", "ORG_ADMIN"], true);
  if (user instanceof Response) return user;

  const body = await req.json();
  const { name, address, hours, acceptedMaterials, feeNotes } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });
  const site = await t.create("dumpSite", {
    data: {
      name: name.trim(),
      address: address?.trim() || null,
      hours: hours?.trim() || null,
      acceptedMaterials: acceptedMaterials?.trim() || null,
      feeNotes: feeNotes?.trim() || null,
    },
  });

  return NextResponse.json(site, { status: 201 });
}
