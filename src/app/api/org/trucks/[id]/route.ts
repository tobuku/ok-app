import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { tenantScope } from "@/lib/tenant";

/** PATCH /api/org/trucks/:id — update truck */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireOrgUser(["DISPATCHER", "ORG_ADMIN"], true);
  if (user instanceof Response) return user;

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = body.name.trim();
  if (body.capacityCubicYards !== undefined) data.capacityCubicYards = body.capacityCubicYards;
  if (body.active !== undefined) data.active = body.active;

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });
  const updated = await t.update("truck", { where: { id }, data });
  return NextResponse.json(updated);
}

/** DELETE /api/org/trucks/:id — soft-delete (set active=false) */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireOrgUser(["ORG_ADMIN"], true);
  if (user instanceof Response) return user;

  const { id } = await params;
  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });
  const updated = await t.update("truck", {
    where: { id },
    data: { active: false },
  });
  return NextResponse.json(updated);
}
