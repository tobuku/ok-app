import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

/** GET /api/org/users — list org users. Org Admin sees all (incl inactive); others see active only. */
export async function GET() {
  const user = await requireOrgUser(["LEADMAN", "DISPATCHER", "ORG_ADMIN"]);
  if (user instanceof Response) return user;

  const where: Record<string, unknown> = { orgId: user.orgId };
  if (user.role !== "ORG_ADMIN") where.active = true;

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      role: true,
      email: true,
      phone: true,
      active: true,
      invitedAt: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

/** POST /api/org/users — create/invite a user (Org Admin only) */
export async function POST(req: NextRequest) {
  const user = await requireOrgUser(["ORG_ADMIN"], true);
  if (user instanceof Response) return user;

  const body = await req.json();
  const { name, email, phone, role } = body;

  if (!name?.trim() || !email?.trim() || !role) {
    return NextResponse.json(
      { error: "name, email, and role are required" },
      { status: 400 }
    );
  }

  const validRoles = ["LEADMAN", "DISPATCHER", "ORG_ADMIN"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Check email uniqueness
  const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  // Create user record (authUid will be set when they accept the invite and create a Supabase account)
  // For now, use a placeholder authUid — the onboarding/invite flow will update it
  const placeholder = `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const newUser = await prisma.user.create({
    data: {
      orgId: user.orgId,
      authUid: placeholder,
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() || null,
      role,
      invitedAt: new Date(),
    },
  });

  await auditLog({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "CREATE",
    entity: "user",
    entityId: newUser.id,
    meta: { role, email: email.trim() },
  });

  return NextResponse.json(newUser, { status: 201 });
}
