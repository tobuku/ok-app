/**
 * Server-side auth: resolve the current user from the Supabase session,
 * load their role + orgId from the database, and check org status.
 */
import { createSupabaseServerClient } from "./supabase-server";
import { prisma } from "./prisma";
import type { OrgRole, OrgStatus } from "@prisma/client";

export type AuthUser = {
  kind: "org_user";
  id: string;
  authUid: string;
  orgId: string;
  orgStatus: OrgStatus;
  timezone: string;
  role: OrgRole;
  name: string;
  email: string;
};

export type AuthPlatformUser = {
  kind: "platform_user";
  id: string;
  authUid: string;
  name: string;
  email: string;
};

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: true; platformUser: AuthPlatformUser }
  | { ok: false; error: string; status: number };

/**
 * Full auth resolution: authenticate → load user → resolve orgId → org status.
 * Returns the resolved user (with orgId, role, orgStatus) or an error.
 */
export async function resolveAuth(): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { ok: false, error: "Not authenticated", status: 401 };
  }

  // Check platform user first
  const platformUser = await prisma.platformUser.findUnique({
    where: { authUid: authUser.id },
  });
  if (platformUser) {
    if (!platformUser.active) {
      return { ok: false, error: "Account disabled", status: 403 };
    }
    return {
      ok: true,
      platformUser: {
        kind: "platform_user",
        id: platformUser.id,
        authUid: platformUser.authUid,
        name: platformUser.name,
        email: platformUser.email,
      },
    };
  }

  // Load org user
  const user = await prisma.user.findUnique({
    where: { authUid: authUser.id },
    include: { organization: { select: { status: true, timezone: true } } },
  });

  if (!user) {
    return { ok: false, error: "User not found", status: 404 };
  }
  if (!user.active) {
    return { ok: false, error: "Account disabled", status: 403 };
  }

  return {
    ok: true,
    user: {
      kind: "org_user",
      id: user.id,
      authUid: user.authUid,
      orgId: user.orgId,
      orgStatus: user.organization.status,
      timezone: user.organization.timezone,
      role: user.role,
      name: user.name,
      email: user.email,
    },
  };
}

/**
 * Require an org user with one of the allowed roles.
 * Also applies org status gate: SUSPENDED = blocked, PAST_DUE = read-only.
 */
export async function requireOrgUser(
  allowedRoles: OrgRole[],
  requireWrite: boolean = false
): Promise<AuthUser | Response> {
  const result = await resolveAuth();

  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: result.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!("user" in result)) {
    return new Response(
      JSON.stringify({ error: "Platform users must use /api/platform routes" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const { user } = result;

  // Org status gate
  if (user.orgStatus === "SUSPENDED") {
    return new Response(
      JSON.stringify({ error: "Organization is suspended" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  if (user.orgStatus === "PAST_DUE" && requireWrite) {
    return new Response(
      JSON.stringify({
        error: "Organization is past due — read-only mode",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // Role check
  if (!allowedRoles.includes(user.role)) {
    return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return user;
}

/**
 * Require a platform admin user.
 */
export async function requirePlatformAdmin(): Promise<
  AuthPlatformUser | Response
> {
  const result = await resolveAuth();

  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: result.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!("platformUser" in result)) {
    return new Response(JSON.stringify({ error: "Platform admin required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return result.platformUser;
}
