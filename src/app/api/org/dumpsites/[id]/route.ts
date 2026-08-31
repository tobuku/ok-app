import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { tenantScope } from "@/lib/tenant";

/** PATCH /api/org/dumpsites/:id — update dump site */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireOrgUser(["DISPATCHER", "ORG_ADMIN"], true);
  if (user instanceof Response) return user;

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  const fields = ["name", "address", "phone", "hours", "weekendHours", "acceptedMaterials", "feeNotes"] as const;
  for (const f of fields) {
    if (body[f] !== undefined) data[f] = body[f]?.trim() || null;
  }
  if (body.active !== undefined) data.active = body.active;

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });
  const updated = await t.update("dumpSite", { where: { id }, data });
  return NextResponse.json(updated);
}

/** DELETE /api/org/dumpsites/:id — soft-delete */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireOrgUser(["ORG_ADMIN"], true);
  if (user instanceof Response) return user;

  const { id } = await params;
  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });
  const updated = await t.update("dumpSite", {
    where: { id },
    data: { active: false },
  });
  return NextResponse.json(updated);
}
