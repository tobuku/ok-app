import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { createSupabaseAdmin } from "@/lib/supabase-server";

const BUCKET = "photos"; // reuse existing bucket, logos stored under org/{orgId}/branding/

/** GET /api/org/branding — get org branding info */
export async function GET() {
  const user = await requireOrgUser(["ORG_ADMIN"]);
  if (user instanceof Response) return user;

  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: { name: true, logoKey: true, receiptsEmail: true, taxRateBps: true },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  // Generate signed URL for logo if it exists
  let logoUrl: string | null = null;
  if (org.logoKey) {
    const supabase = await createSupabaseAdmin();
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(org.logoKey, 3600);
    logoUrl = data?.signedUrl ?? null;
  }

  return NextResponse.json({ ...org, logoUrl });
}

/** PATCH /api/org/branding — update receiptsEmail and/or taxRateBps */
export async function PATCH(req: NextRequest) {
  const user = await requireOrgUser(["ORG_ADMIN"], true);
  if (user instanceof Response) return user;

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.receiptsEmail !== undefined) {
    data.receiptsEmail = body.receiptsEmail?.trim() || null;
  }
  if (body.taxRateBps !== undefined) {
    const bps = parseInt(body.taxRateBps, 10);
    if (isNaN(bps) || bps < 0 || bps > 5000) {
      return NextResponse.json({ error: "taxRateBps must be 0-5000" }, { status: 400 });
    }
    data.taxRateBps = bps;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await prisma.organization.update({
    where: { id: user.orgId },
    data,
    select: { name: true, logoKey: true, receiptsEmail: true, taxRateBps: true },
  });

  await auditLog({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "UPDATE",
    entity: "organization",
    entityId: user.orgId,
    meta: { fields: Object.keys(data) },
  });

  return NextResponse.json(updated);
}

/** POST /api/org/branding — upload logo */
export async function POST(req: NextRequest) {
  const user = await requireOrgUser(["ORG_ADMIN"], true);
  if (user instanceof Response) return user;

  const formData = await req.formData();
  const file = formData.get("logo") as File | null;

  if (!file) {
    return NextResponse.json({ error: "logo file is required" }, { status: 400 });
  }

  // Validate file type
  const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json(
      { error: "Logo must be PNG, JPEG, WebP, or SVG" },
      { status: 400 }
    );
  }

  // Max 2MB
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Logo must be under 2MB" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "png";
  const key = `org/${user.orgId}/branding/logo_${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const supabase = await createSupabaseAdmin();
  const { error } = await supabase.storage.from(BUCKET).upload(key, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Delete old logo if exists
  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: { logoKey: true },
  });
  if (org?.logoKey) {
    await supabase.storage.from(BUCKET).remove([org.logoKey]);
  }

  // Update org with new logo key
  await prisma.organization.update({
    where: { id: user.orgId },
    data: { logoKey: key },
  });

  await auditLog({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "UPDATE",
    entity: "organization",
    entityId: user.orgId,
    meta: { field: "logoKey" },
  });

  // Return signed URL
  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(key, 3600);

  return NextResponse.json({ logoKey: key, logoUrl: signed?.signedUrl ?? null });
}
