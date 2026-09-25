/**
 * GET /api/org/jobs/:id/pay/status — Poll payment status
 * Used by the leadman's phone to detect when a customer completes
 * card payment via QR code / texted link.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const userOrRes = await requireOrgUser(["LEADMAN", "DISPATCHER", "ORG_ADMIN"], true);
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes;

  const payment = await prisma.payment.findFirst({
    where: { jobId, orgId: user.orgId },
    orderBy: { createdAt: "desc" },
    select: { status: true, receiptToken: true },
  });

  return NextResponse.json({
    paid: payment?.status === "SUCCEEDED",
    failed: payment?.status === "FAILED",
    status: payment?.status ?? null,
    receiptToken: payment?.status === "SUCCEEDED" ? payment.receiptToken : null,
  });
}
