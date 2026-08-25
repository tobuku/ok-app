import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdmin } from "@/lib/supabase-server";

/**
 * POST /api/onboarding/accept-invite
 * Accept an invite: create Supabase Auth user, link to existing User record.
 * Body: { token, password }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token, password } = body;

  if (!token || !password) {
    return NextResponse.json(
      { error: "token and password are required" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  // Find user by invite token
  const user = await prisma.user.findFirst({
    where: { authUid: `invite_${token}` },
    include: { organization: { select: { name: true, status: true } } },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
  }

  // Check invite age (7 days)
  if (user.invitedAt) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    if (user.invitedAt < sevenDaysAgo) {
      return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
    }
  }

  // Create Supabase Auth user
  const supabase = await createSupabaseAdmin();
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: user.email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    console.error("Failed to create auth user:", authError);
    return NextResponse.json(
      { error: authError?.message || "Failed to create account" },
      { status: 500 }
    );
  }

  // Link auth UID to user record
  await prisma.user.update({
    where: { id: user.id },
    data: { authUid: authData.user.id },
  });

  return NextResponse.json({
    ok: true,
    email: user.email,
    orgName: user.organization.name,
    role: user.role,
  });
}
