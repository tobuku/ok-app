import { NextResponse } from "next/server";
import { resolveAuth } from "@/lib/auth";

/** GET /api/auth/me — return current user type and role for client-side redirect */
export async function GET() {
  const result = await resolveAuth();

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if ("platformUser" in result) {
    return NextResponse.json({
      kind: "platform_user",
      name: result.platformUser.name,
    });
  }

  return NextResponse.json({
    kind: "org_user",
    role: result.user.role,
    orgStatus: result.user.orgStatus,
    name: result.user.name,
  });
}
