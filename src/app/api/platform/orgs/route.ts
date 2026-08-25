import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { sendOrgInvite } from "@/lib/email";
import { createBillingCustomer, TRIAL_DAYS } from "@/lib/stripe-billing";
import crypto from "crypto";

/** GET /api/platform/orgs — list all organizations */
export async function GET(req: NextRequest) {
  const admin = await requirePlatformAdmin();
  if (admin instanceof Response) return admin;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("q");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) where.name = { contains: search, mode: "insensitive" };

  const orgs = await prisma.organization.findMany({
    where,
    include: {
      subscription: { include: { plan: { select: { name: true } } } },
      _count: { select: { users: true, jobs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orgs);
}

/** POST /api/platform/orgs — create org + invite Org Admin by email */
export async function POST(req: NextRequest) {
  const admin = await requirePlatformAdmin();
  if (admin instanceof Response) return admin;

  const body = await req.json();
  const { name, slug, adminEmail, adminName, timezone } = body;

  if (!name?.trim() || !slug?.trim() || !adminEmail?.trim() || !adminName?.trim()) {
    return NextResponse.json(
      { error: "name, slug, adminEmail, and adminName are required" },
      { status: 400 }
    );
  }

  // Check slug uniqueness
  const existing = await prisma.organization.findUnique({
    where: { slug: slug.trim().toLowerCase() },
  });
  if (existing) {
    return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
  }

  // Check email uniqueness
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail.trim() },
  });
  if (existingUser) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  // Generate invite token
  const inviteToken = crypto.randomBytes(32).toString("hex");

  // Create Stripe billing customer
  let stripeCustomerId: string | null = null;
  try {
    stripeCustomerId = await createBillingCustomer({
      orgId: "pending", // will update after org creation
      orgName: name.trim(),
      email: adminEmail.trim(),
    });
  } catch (err) {
    console.error("Failed to create Stripe customer:", err);
    // Non-fatal: org can still be created without billing customer
  }

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  // Create org
  const org = await prisma.organization.create({
    data: {
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      timezone: timezone?.trim() || "Pacific/Honolulu",
      status: "TRIALING",
      stripeCustomerId,
      trialEndsAt,
    },
  });

  // Create the org admin user with invite token in authUid (placeholder)
  const orgAdmin = await prisma.user.create({
    data: {
      orgId: org.id,
      authUid: `invite_${inviteToken}`,
      name: adminName.trim(),
      email: adminEmail.trim(),
      role: "ORG_ADMIN",
      invitedAt: new Date(),
    },
  });

  // Seed a default price book
  const priceBook = await prisma.priceBook.create({
    data: {
      orgId: org.id,
      name: "Default",
      active: true,
    },
  });

  // Seed default price items
  const defaultItems = [
    { kind: "LOAD_FRACTION", label: "Minimum", fraction: 0.0, amountCents: 12500, sortOrder: 0 },
    { kind: "LOAD_FRACTION", label: "1/8 Load", fraction: 0.125, amountCents: 15625, sortOrder: 1 },
    { kind: "LOAD_FRACTION", label: "1/4 Load", fraction: 0.25, amountCents: 25000, sortOrder: 2 },
    { kind: "LOAD_FRACTION", label: "3/8 Load", fraction: 0.375, amountCents: 37500, sortOrder: 3 },
    { kind: "LOAD_FRACTION", label: "1/2 Load", fraction: 0.5, amountCents: 50000, sortOrder: 4 },
    { kind: "LOAD_FRACTION", label: "5/8 Load", fraction: 0.625, amountCents: 62500, sortOrder: 5 },
    { kind: "LOAD_FRACTION", label: "3/4 Load", fraction: 0.75, amountCents: 75000, sortOrder: 6 },
    { kind: "LOAD_FRACTION", label: "7/8 Load", fraction: 0.875, amountCents: 87500, sortOrder: 7 },
    { kind: "LOAD_FRACTION", label: "Full Load", fraction: 1.0, amountCents: 100000, sortOrder: 8 },
    { kind: "ADDON", label: "Mattress", fraction: null, amountCents: 5000, sortOrder: 10 },
    { kind: "ADDON", label: "Appliance", fraction: null, amountCents: 5000, sortOrder: 11 },
    { kind: "ADDON", label: "Tires (each)", fraction: null, amountCents: 1500, sortOrder: 12 },
    { kind: "FEE", label: "Stairs (per flight)", fraction: null, amountCents: 2500, sortOrder: 20 },
    { kind: "FEE", label: "Heavy Material", fraction: null, amountCents: 5000, sortOrder: 21 },
  ];

  await prisma.priceItem.createMany({
    data: defaultItems.map((item) => ({
      orgId: org.id,
      priceBookId: priceBook.id,
      kind: item.kind as "LOAD_FRACTION" | "ADDON" | "FEE",
      label: item.label,
      fraction: item.fraction,
      amountCents: item.amountCents,
      sortOrder: item.sortOrder,
      active: true,
    })),
  });

  // Send invite email
  try {
    await sendOrgInvite({
      to: adminEmail.trim(),
      orgName: name.trim(),
      inviteToken,
    });
  } catch (err) {
    console.error("Failed to send invite email:", err);
  }

  await auditLog({
    orgId: org.id,
    actorPlatformUserId: admin.id,
    action: "CREATE_ORG",
    entity: "organization",
    entityId: org.id,
    meta: { adminEmail: adminEmail.trim(), adminName: adminName.trim() },
  });

  return NextResponse.json(
    { org, orgAdmin: { id: orgAdmin.id, email: orgAdmin.email } },
    { status: 201 }
  );
}
