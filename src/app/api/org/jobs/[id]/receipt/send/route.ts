/**
 * POST /api/org/jobs/:id/receipt/send — Send (or resend) receipt email
 * Used by the leadman to send the customer a receipt after payment.
 * Body: { email: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { tenantScope } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { sendReceipt } from "@/lib/email";
import { getSignedUrl } from "@/lib/storage";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const userOrRes = await requireOrgUser(["LEADMAN", "DISPATCHER", "ORG_ADMIN"], true);
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes;

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  // Get the succeeded payment
  const payment = await prisma.payment.findFirst({
    where: { jobId, orgId: user.orgId, status: "SUCCEEDED" },
    orderBy: { paidAt: "desc" },
    select: { receiptToken: true, method: true, paidAt: true },
  });
  if (!payment) {
    return NextResponse.json({ error: "No payment found" }, { status: 400 });
  }

  // Get the accepted quote with lines
  const quote = await t.findFirst<{
    id: string;
    totalCents: number;
    subtotalCents: number;
    discountCents: number;
    discountReason: string | null;
    taxCents: number;
    signatureKey: string | null;
    acceptedAt: Date | null;
  }>("quote", {
    where: { jobId, status: "ACCEPTED" },
  });
  if (!quote) {
    return NextResponse.json({ error: "No accepted quote found" }, { status: 400 });
  }

  const lines = await t.findMany<{
    label: string;
    qty: number;
    totalCents: number;
  }>("quoteLine", {
    where: { quoteId: quote.id },
  });

  const job = await t.findFirst<{ jobNumber: number }>("job", {
    where: { id: jobId },
    select: { jobNumber: true },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: { name: true, logoKey: true, receiptsEmail: true, senderEmail: true },
  });

  let logoUrl: string | null = null;
  if (org?.logoKey) {
    logoUrl = await getSignedUrl(org.logoKey);
  }

  let signatureUrl: string | null = null;
  if (quote.signatureKey) {
    signatureUrl = await getSignedUrl(quote.signatureKey).catch(() => null);
  }

  try {
    await sendReceipt({
      receiptToken: payment.receiptToken,
      orgId: user.orgId,
      jobId,
      orgName: org?.name ?? "Service Provider",
      orgLogoUrl: logoUrl,
      senderEmail: org?.senderEmail,
      receiptsEmail: org?.receiptsEmail,
      customerEmail: email,
      jobNumber: job.jobNumber,
      lines,
      subtotalCents: quote.subtotalCents,
      discountCents: quote.discountCents,
      discountReason: quote.discountReason,
      taxCents: quote.taxCents,
      totalCents: quote.totalCents,
      paymentMethod: payment.method as "CARD" | "CASH" | "CHECK",
      paidAt: payment.paidAt ?? new Date(),
      signatureUrl,
      acceptedAt: quote.acceptedAt,
    });

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("Failed to send receipt:", err);
    return NextResponse.json({ error: "Failed to send receipt" }, { status: 500 });
  }
}
