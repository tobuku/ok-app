/**
 * GET /api/org/jobs/:id/invoice — Generates a printable/shareable HTML invoice
 * Uses the same receipt template as email but returns it as HTML response.
 * White-labeled per CLAUDE.md — tenant branding only.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { tenantScope } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/format";
import { getSignedUrl } from "@/lib/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const userOrRes = await requireOrgUser(["LEADMAN", "DISPATCHER", "ORG_ADMIN"], true);
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes;

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  const job = await t.findFirst<{ id: string; jobNumber: number }>("job", {
    where: { id: jobId },
    select: { id: true, jobNumber: true },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const quote = await t.findFirst<{
    id: string;
    subtotalCents: number;
    discountCents: number;
    discountReason: string | null;
    taxCents: number;
    totalCents: number;
    acceptedAt: Date | null;
  }>("quote", {
    where: { jobId, status: "ACCEPTED" },
  });
  if (!quote) {
    return NextResponse.json({ error: "No accepted quote" }, { status: 400 });
  }

  const lines = await t.findMany<{
    label: string;
    qty: number;
    totalCents: number;
  }>("quoteLine", {
    where: { quoteId: quote.id },
  });

  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: { name: true, logoKey: true },
  });

  let logoUrl: string | null = null;
  if (org?.logoKey) {
    logoUrl = await getSignedUrl(org.logoKey);
  }

  const payment = await t.findFirst<{
    method: string;
    paidAt: Date | null;
  }>("payment", {
    where: { jobId, status: "SUCCEEDED" },
    select: { method: true, paidAt: true },
  });

  const orgName = org?.name ?? "Service Provider";
  const paidDate = payment?.paidAt
    ? new Date(payment.paidAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : quote.acceptedAt
    ? new Date(quote.acceptedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${orgName}" style="max-height:60px;margin:0 auto 12px;" />`
    : `<h1 style="margin:0 0 8px;font-size:24px;color:#ffffff;">${orgName}</h1>`;

  const lineRows = lines
    .map(
      (l) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#374151;">
          ${l.label}${l.qty > 1 ? ` x${l.qty}` : ""}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;color:#111827;font-weight:500;">
          ${formatCents(l.totalCents)}
        </td>
      </tr>`
    )
    .join("");

  const discountRow =
    quote.discountCents > 0
      ? `<tr>
          <td style="padding:4px 0;color:#dc2626;">Discount${quote.discountReason ? ` (${quote.discountReason})` : ""}</td>
          <td style="padding:4px 0;text-align:right;color:#dc2626;">-${formatCents(quote.discountCents)}</td>
        </tr>`
      : "";

  const taxRow =
    quote.taxCents > 0
      ? `<tr>
          <td style="padding:4px 0;color:#6b7280;">Tax</td>
          <td style="padding:4px 0;text-align:right;color:#111827;">${formatCents(quote.taxCents)}</td>
        </tr>`
      : "";

  const paymentStatus = payment
    ? `<div style="margin-top:16px;padding:12px;background:#f0fdf4;border-radius:8px;text-align:center;">
        <p style="margin:0;color:#166534;font-weight:600;">Paid by ${payment.method === "CARD" ? "Card" : "Cash"}</p>
      </div>`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>Invoice — ${orgName} Job #${job.jobNumber}</title>
  <style>
    @media print { body { background: white !important; } }
  </style>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:24px;">
    <div style="background:#111827;border-radius:12px 12px 0 0;padding:32px 24px;text-align:center;">
      ${logoHtml}
      <p style="margin:0;color:#9ca3af;font-size:14px;">Invoice</p>
    </div>
    <div style="background:#ffffff;border-radius:0 0 12px 12px;padding:24px;border:1px solid #e5e7eb;border-top:none;">
      <p style="color:#6b7280;font-size:14px;margin:0 0 4px;">Job #${job.jobNumber}</p>
      <p style="color:#6b7280;font-size:14px;margin:0 0 16px;">${paidDate}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${lineRows}
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px;">
        <tr>
          <td style="padding:4px 0;color:#6b7280;">Subtotal</td>
          <td style="padding:4px 0;text-align:right;color:#111827;">${formatCents(quote.subtotalCents)}</td>
        </tr>
        ${discountRow}
        ${taxRow}
        <tr>
          <td style="padding:12px 0 4px;font-size:18px;font-weight:700;color:#111827;border-top:2px solid #e5e7eb;">Total</td>
          <td style="padding:12px 0 4px;font-size:18px;font-weight:700;text-align:right;color:#111827;border-top:2px solid #e5e7eb;">${formatCents(quote.totalCents)}</td>
        </tr>
      </table>
      ${paymentStatus}
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">
      Thank you for your business.
    </p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
