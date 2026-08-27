/**
 * GET/POST /api/org/jobs/:id/notes — Append-only job notes log
 * Leadman, Dispatcher, or Org Admin can read and append.
 * Optionally saves as address warning when isAddressNote=true.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { tenantScope } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const userOrRes = await requireOrgUser(["LEADMAN", "DISPATCHER", "ORG_ADMIN"], true);
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes;

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  const notes = await t.findMany<{
    id: string;
    text: string;
    createdAt: Date;
    createdById: string;
  }>("jobNote", {
    where: { jobId },
    orderBy: { createdAt: "desc" },
  });

  // Resolve creator names
  const userIds = [...new Set(notes.map((n) => n.createdById))];
  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameMap = new Map(users.map((u) => [u.id, u.name]));

  return NextResponse.json({
    notes: notes.map((n) => ({
      id: n.id,
      text: n.text,
      createdByName: nameMap.get(n.createdById) ?? "Unknown",
      createdAt: n.createdAt,
    })),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const userOrRes = await requireOrgUser(["LEADMAN", "DISPATCHER", "ORG_ADMIN"], true);
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes;

  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const isAddressNote = body.isAddressNote === true;

  if (!text) {
    return NextResponse.json({ error: "Note text required" }, { status: 400 });
  }

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  // Verify job exists
  const job = await t.findFirst<{ id: string; addressId: string | null }>("job", {
    where: { id: jobId },
    select: { id: true, addressId: true },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Create job note
  const note = await prisma.jobNote.create({
    data: {
      orgId: user.orgId,
      jobId,
      text,
      createdById: user.id,
    },
  });

  // Also create address note if flagged
  if (isAddressNote && job.addressId) {
    await prisma.addressNote.create({
      data: {
        orgId: user.orgId,
        addressId: job.addressId,
        jobId,
        note: text,
        createdById: user.id,
      },
    });
  }

  await auditLog({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "JOB_NOTE_ADDED",
    entity: "jobNote",
    entityId: note.id,
    meta: { jobId, isAddressNote },
  });

  return NextResponse.json({
    note: {
      id: note.id,
      text: note.text,
      createdByName: user.name,
      createdAt: note.createdAt,
    },
  });
}
