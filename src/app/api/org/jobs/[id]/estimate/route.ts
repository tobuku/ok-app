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
    notes: string | null;
    validDays: number | null;
    paymentTerms: string | null;
    projectName: string | null;
    projectLocation: string | null;
    solicitationNo: string | null;
    rfqNumber: string | null;
    contractNumber: string | null;
    agencyDept: string | null;
    pocName: string | null;
    pocPhone: string | null;
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
    unitCents: number;
    totalCents: number;
    unitLabel: string | null;
    description: string | null;
    category: string | null;
  }>("quoteLine", {
    where: { quoteId: quote.id },
  });

  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: { name: true, logoKey: true, receiptsEmail: true, phone: true, address: true, licenseNumber: true },
  });

  let logoUrl: string | null = null;
  if (org?.logoKey) {
    logoUrl = await getSignedUrl(org.logoKey);
  }

  const orgName = org?.name ?? "Service Provider";
  const orgPhone = org?.phone ?? "";
  const orgAddress = org?.address ?? "";
  const orgLicense = org?.licenseNumber ?? "";

  const createdDate = new Date(quote.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Compute validity date
  let validUntil = "";
  if (quote.validDays) {
    const d = new Date(quote.createdAt);
    d.setDate(d.getDate() + quote.validDays);
    validUntil = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${orgName}" style="max-height:60px;margin:0 auto 12px;" />`
    : `<h1 style="margin:0 0 8px;font-size:24px;color:#ffffff;">${orgName}</h1>`;

  const orgSubInfo = [orgAddress, orgPhone].filter(Boolean).join(" &bull; ");

  // Determine if any line has a category (govQuote mode for table headers)
  const hasCategories = lines.some((l) => l.category);

  const lineRows = lines
    .map((l, i) => {
      const num = String(i + 1).padStart(3, "0");
      let qtyDisplay = "";
      if (l.unitLabel && l.unitLabel !== "flat" && l.qty > 0) {
        const singular = l.unitLabel.replace(/s$/, "");
        qtyDisplay = `${l.qty} ${l.unitLabel} x ${formatCents(l.unitCents)}/${singular}`;
      } else if (l.qty > 1) {
        qtyDisplay = `${l.qty} x ${formatCents(l.unitCents)}`;
      }

      const descRow = l.description
        ? `<tr><td colspan="${hasCategories ? 5 : 4}" style="padding:0 0 6px 24px;color:#9ca3af;font-size:12px;word-break:break-word;">${l.description}</td></tr>`
        : "";

      const bb = l.description ? "" : "border-bottom:1px solid #f0f0f0;";
      const catCell = hasCategories ? `<td style="padding:8px 4px;${bb}color:#6b7280;font-size:12px;white-space:nowrap;">${l.category ?? ""}</td>` : "";

      return `<tr>
        <td style="padding:8px 4px;${bb}color:#9ca3af;font-size:12px;font-family:monospace;">${num}</td>
        ${catCell}
        <td style="padding:8px 4px;${bb}color:#374151;">${l.label}</td>
        <td style="padding:8px 4px;${bb}color:#6b7280;font-size:12px;white-space:nowrap;">${qtyDisplay}</td>
        <td style="padding:8px 4px;${bb}text-align:right;color:#111827;font-weight:500;white-space:nowrap;">${formatCents(l.totalCents)}</td>
      </tr>${descRow}`;
    })
    .join("");

  const tableHeader = `<tr style="border-bottom:2px solid #e5e7eb;">
    <th style="padding:6px 4px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600;">#</th>
    ${hasCategories ? `<th style="padding:6px 4px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600;">Category</th>` : ""}
    <th style="padding:6px 4px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600;">Description</th>
    <th style="padding:6px 4px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600;">Qty / Unit</th>
    <th style="padding:6px 4px;text-align:right;color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600;">Amount</th>
  </tr>`;

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

  // Build info block (two column: left = quote ref, right = dates/terms)
  const infoLeft = [
    `<p style="margin:0;color:#374151;font-size:13px;"><strong>Quote #</strong> OPK-${job.jobNumber}</p>`,
    quote.projectName ? `<p style="margin:2px 0 0;color:#374151;font-size:13px;"><strong>Project:</strong> ${quote.projectName}</p>` : "",
    quote.projectLocation ? `<p style="margin:2px 0 0;color:#374151;font-size:13px;"><strong>Location:</strong> ${quote.projectLocation}</p>` : "",
  ].filter(Boolean).join("\n");

  const infoRight = [
    `<p style="margin:0;color:#374151;font-size:13px;"><strong>Date:</strong> ${createdDate}</p>`,
    validUntil ? `<p style="margin:2px 0 0;color:#374151;font-size:13px;"><strong>Valid Until:</strong> ${validUntil}</p>` : "",
    quote.paymentTerms ? `<p style="margin:2px 0 0;color:#374151;font-size:13px;"><strong>Payment Terms:</strong> ${quote.paymentTerms}</p>` : "",
  ].filter(Boolean).join("\n");

  // Contract details block (only if any gov fields set)
  const hasGovFields = quote.agencyDept || quote.solicitationNo || quote.rfqNumber || quote.contractNumber || quote.pocName;
  const contractBlock = hasGovFields ? `
    <div style="margin-bottom:16px;padding:12px;background:#f3f4f6;border-radius:8px;font-size:13px;color:#374151;">
      <p style="margin:0 0 6px;font-weight:700;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Contract Details</p>
      ${quote.agencyDept ? `<p style="margin:0 0 2px;"><strong>Agency:</strong> ${quote.agencyDept}</p>` : ""}
      ${quote.solicitationNo ? `<p style="margin:0 0 2px;"><strong>Solicitation #:</strong> ${quote.solicitationNo}</p>` : ""}
      ${quote.rfqNumber ? `<p style="margin:0 0 2px;"><strong>RFQ #:</strong> ${quote.rfqNumber}</p>` : ""}
      ${quote.contractNumber ? `<p style="margin:0 0 2px;"><strong>Contract #:</strong> ${quote.contractNumber}</p>` : ""}
      ${quote.pocName ? `<p style="margin:0 0 2px;"><strong>POC:</strong> ${quote.pocName}${quote.pocPhone ? `, ${quote.pocPhone}` : ""}</p>` : ""}
    </div>` : "";

  const footerParts = [
    orgLicense ? `License #: ${orgLicense}` : "",
    orgName,
    orgAddress,
    orgPhone,
    org?.receiptsEmail || "",
  ].filter(Boolean);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>Estimate — ${orgName} Job #${job.jobNumber}</title>
  <style>
    @page {
      margin: 0.5in;
      @top-left { content: none; }
      @top-center { content: none; }
      @top-right { content: none; }
      @bottom-left { content: none; }
      @bottom-center { content: none; }
      @bottom-right { content: none; }
    }
    @media print {
      body { background: white !important; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#111827;border-radius:12px 12px 0 0;padding:32px 24px;text-align:center;">
      ${logoHtml}
      ${orgSubInfo ? `<p style="margin:4px 0 0;color:#9ca3af;font-size:12px;">${orgSubInfo}</p>` : ""}
      <p style="margin:8px 0 0;color:#9ca3af;font-size:14px;">Estimate</p>
    </div>
    <div style="background:#ffffff;border-radius:0 0 12px 12px;padding:24px;border:1px solid #e5e7eb;border-top:none;">

      <!-- Info block -->
      <div style="display:flex;justify-content:space-between;margin-bottom:16px;gap:16px;">
        <div style="flex:1;">${infoLeft}</div>
        <div style="flex:1;text-align:right;">${infoRight}</div>
      </div>

      ${contractBlock}

      <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #e5e7eb;">
        <p style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Prepared for</p>
        ${customerInfo}
      </div>

      ${loadsNote}
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${tableHeader}
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

      ${quote.notes ? `<div style="margin-top:20px;padding:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;">
        <p style="margin:0 0 4px;font-weight:700;font-size:11px;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;">Scope of Work / Notes</p>
        <p style="margin:0;color:#78350f;font-size:13px;line-height:1.5;white-space:pre-line;word-break:break-word;">${quote.notes}</p>
      </div>` : ""}

      <div style="margin-top:20px;padding:12px;background:#f0f9ff;border-radius:8px;text-align:center;">
        <p style="margin:0;color:#1e40af;font-size:13px;">This is an estimate. Final pricing may vary based on actual job conditions.</p>
      </div>
    </div>

    <div style="max-width:600px;margin:12px auto 0;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:10px;line-height:1.4;color:#6b7280;">
      <p style="margin:0 0 6px;font-weight:700;font-size:11px;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">Terms &amp; Conditions</p>
      <p style="margin:0 0 4px;">By accepting this estimate, you authorize ${orgName} to remove the items and/or materials identified above from the specified location.</p>
      <p style="margin:0 0 4px;"><strong>All sales are final.</strong> No refunds or chargebacks will be issued once work has commenced.</p>
      <p style="margin:0 0 4px;"><strong>Damage disclaimer:</strong> ${orgName} exercises reasonable care during removal but is not liable for pre-existing damage, cosmetic wear to surfaces during removal of heavy or oversized items, or damage to items not included in this estimate that are in the removal path.</p>
      <p style="margin:0 0 4px;"><strong>Hazardous materials:</strong> This estimate does not cover hazardous, biohazard, or regulated materials unless explicitly listed.</p>
      <p style="margin:0 0 4px;"><strong>Abandoned items:</strong> All removed items become the property of ${orgName} for disposal, recycling, or resale.</p>
    </div>

    <div style="text-align:center;margin-top:16px;font-size:12px;color:#6b7280;line-height:1.6;">
      <p style="margin:0;">${footerParts.join(" &bull; ")}</p>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
