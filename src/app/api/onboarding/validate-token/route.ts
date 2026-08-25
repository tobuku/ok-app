import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/onboarding/validate-token?token=xxx
 * Check if an invite token is valid and return org/user info.
 */
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { authUid: `invite_${token}` },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      invitedAt: true,
      organization: { select: { id: true, name: true, slug: true, status: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ valid: false, error: "Invalid invite" }, { status: 404 });
  }

  // Check invite age
  if (user.invitedAt) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    if (user.invitedAt < sevenDaysAgo) {
      return NextResponse.json({ valid: false, error: "Invite expired" }, { status: 410 });
    }
  }

  return NextResponse.json({
    valid: true,
    user: { name: user.name, email: user.email, role: user.role },
    org: user.organization,
  });
}
