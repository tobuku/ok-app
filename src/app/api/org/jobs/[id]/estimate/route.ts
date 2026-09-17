/**
 * GET /api/org/jobs/:id/estimate — Generates a printable/shareable HTML estimate
 * Works for any quote status (DRAFT, PRESENTED, ACCEPTED, etc.)
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

  const job = await t.findFirst<{
    id: string;
    jobNumber: number;
    customer: { name: string; phone: string | null; email: string | null };
    address: { line1: string; city: string; state: string; zip: string } | null;
  }>("job", {
    where: { id: jobId },
    select: {
      id: true,
      jobNumber: true,
      customer: { select: { name: true, phone: true, email: true } },
      address: { select: { line1: true, city: true, state: true, zip: true } },
    },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Get latest quote (any status)
  const quotes = await t.findMany<{
    id: string;
    status: string;
    truckLoads: number;
    subtotalCents: number;
    discountCents: number;
    discountReason: string | null;
    taxCents: number;
    totalCents: number;
    createdAt: Date;
  }>("quote", {
    where: { jobId },
    orderBy: { createdAt: "desc" },
    take: 1,
  });
  const quote = quotes[0];
  if (!quote) {
    return NextResponse.json({ error: "No quote found" }, { status: 400 });
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
    select: { name: true, logoKey: true, receiptsEmail: true },
  });

  let logoUrl: string | null = null;
  if (org?.logoKey) {
    logoUrl = await getSignedUrl(org.logoKey);
  }

  const orgName = org?.name ?? "Service Provider";
  const createdDate = new Date(quote.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

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

  const loadsNote =
    quote.truckLoads > 1
      ? `<p style="color:#6b7280;font-size:13px;margin:0 0 8px;">Truck loads: ${quote.truckLoads}</p>`
      : "";

  const customerInfo = [
    `<p style="margin:0;font-weight:600;color:#111827;">${job.customer.name}</p>`,
    job.customer.phone ? `<p style="margin:2px 0 0;color:#6b7280;font-size:13px;">${job.customer.phone}</p>` : "",
    job.customer.email ? `<p style="margin:2px 0 0;color:#6b7280;font-size:13px;">${job.customer.email}</p>` : "",
    job.address ? `<p style="margin:2px 0 0;color:#6b7280;font-size:13px;">${job.address.line1}, ${job.address.city}, ${job.address.state} ${job.address.zip}</p>` : "",
  ].join("\n");

  const contactInfo = org?.receiptsEmail
    ? `<p style="text-align:center;color:#6b7280;font-size:12px;margin-top:8px;">Contact: ${org.receiptsEmail}</p>`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>Estimate — ${orgName} Job #${job.jobNumber}</title>
  <style>
    @media print {
      body { background: white !important; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:24px;">
    <div style="background:#111827;border-radius:12px 12px 0 0;padding:32px 24px;text-align:center;">
      ${logoHtml}
      <p style="margin:0;color:#9ca3af;font-size:14px;">Estimate</p>
    </div>
    <div style="background:#ffffff;border-radius:0 0 12px 12px;padding:24px;border:1px solid #e5e7eb;border-top:none;">
      <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
        <div>
          <p style="color:#6b7280;font-size:13px;margin:0;">Job #${job.jobNumber}</p>
          <p style="color:#6b7280;font-size:13px;margin:2px 0 0;">${createdDate}</p>
        </div>
      </div>

      <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #e5e7eb;">
        <p style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Prepared for</p>
        ${customerInfo}
      </div>

      ${loadsNote}
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

      <div style="margin-top:20px;padding:12px;background:#f0f9ff;border-radius:8px;text-align:center;">
        <p style="margin:0;color:#1e40af;font-size:13px;">This is an estimate. Final pricing may vary based on actual job conditions.</p>
      </div>
    </div>
    <div style="max-width:480px;margin:12px auto 0;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:10px;line-height:1.4;color:#6b7280;">
      <p style="margin:0 0 6px;font-weight:700;font-size:11px;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">Terms &amp; Conditions</p>
      <p style="margin:0 0 4px;">By accepting this estimate, you authorize ${orgName} to remove the items and/or materials identified above from the specified location.</p>
      <p style="margin:0 0 4px;"><strong>All sales are final.</strong> No refunds or chargebacks will be issued once work has commenced.</p>
      <p style="margin:0 0 4px;"><strong>Damage disclaimer:</strong> ${orgName} exercises reasonable care during removal but is not liable for pre-existing damage, cosmetic wear to surfaces during removal of heavy or oversized items, or damage to items not included in this estimate that are in the removal path.</p>
      <p style="margin:0 0 4px;"><strong>Hazardous materials:</strong> This estimate does not cover hazardous, biohazard, or regulated materials unless explicitly listed.</p>
      <p style="margin:0 0 4px;"><strong>Abandoned items:</strong> All removed items become the property of ${orgName} for disposal, recycling, or resale.</p>
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">
      Thank you for considering ${orgName}.
    </p>
    ${contactInfo}
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
