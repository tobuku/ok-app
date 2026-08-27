/**
 * POST /api/org/quotes/:id/accept — Customer accepts the quote
 * Transitions quote to ACCEPTED and job to ACCEPTED
 */
import { NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { tenantScope } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { assertTransition } from "@/lib/status";
import { signatureKey, uploadPhoto } from "@/lib/storage";
import type { JobStatus } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: quoteId } = await params;
  const body = await request.json().catch(() => ({}));
  const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim() : null;
  const signatureData = typeof body.signatureData === "string" ? body.signatureData : null;
  const userOrRes = await requireOrgUser(["LEADMAN", "ORG_ADMIN"], true);
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes;

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  const quote = await t.findFirst<{
    id: string;
    status: string;
    jobId: string;
  }>("quote", {
    where: { id: quoteId },
  });
  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }
  if (quote.status !== "PRESENTED") {
    return NextResponse.json(
      { error: `Cannot accept quote in status ${quote.status}` },
      { status: 400 }
    );
  }

  // Get current job status for transition guard
  const job = await t.findFirst<{ id: string; status: JobStatus }>("job", {
    where: { id: quote.jobId },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  assertTransition(job.status, "ACCEPTED");

  // Upload signature if provided
  let sigKey: string | null = null;
  if (signatureData) {
    const base64Match = signatureData.match(/^data:image\/png;base64,(.+)$/);
    if (base64Match) {
      const buffer = Buffer.from(base64Match[1], "base64");
      const key = signatureKey(user.orgId, quoteId);
      const result = await uploadPhoto(key, buffer, "image/png");
      if (!result.error) {
        sigKey = key;
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.quote.update({
      where: { id: quoteId },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        ...(customerEmail ? { customerEmail } : {}),
        ...(sigKey ? { signatureKey: sigKey } : {}),
      },
    });
    await tx.job.update({
      where: { id: quote.jobId },
      data: { status: "ACCEPTED" },
    });
  });

  return NextResponse.json({ status: "ACCEPTED" });
}
