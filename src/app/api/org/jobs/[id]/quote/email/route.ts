/**
 * POST /api/org/jobs/:id/quote/email — Email the latest quote to a customer
 * Generates a viewToken if one doesn't exist, then sends a branded email
 * with a link to the public view-only quote page.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { tenantScope } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/format";
import { randomBytes } from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const userOrRes = await requireOrgUser(["LEADMAN", "DISPATCHER", "ORG_ADMIN"], true);
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes;

  const body = await request.json();
  const { email } = body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  // Get the latest quote for this job
  const quotes = await t.findMany<{
    id: string;
    status: string;
    viewToken: string | null;
    subtotalCents: number;
    discountCents: number;
    discountReason: string | null;
    taxCents: number;
    totalCents: number;
    truckLoads: number;
    notes: string | null;
    createdAt: Date;
  }>("quote", {
    where: { jobId },
    orderBy: { createdAt: "desc" },
    take: 1,
  });

  const quote = quotes[0];
  if (!quote) {
    return NextResponse.json({ error: "No quote found for this job" }, { status: 404 });
  }

  // Generate viewToken if not exists
  let viewToken = quote.viewToken;
  if (!viewToken) {
    viewToken = randomBytes(24).toString("base64url");
    await prisma.quote.update({
      where: { id: quote.id },
      data: { viewToken, customerEmail: email },
    });
  } else {
    // Update customer email
    await prisma.quote.update({
      where: { id: quote.id },
      data: { customerEmail: email },
    });
  }

  // Get org details for branding
  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: {
      name: true,
      senderEmail: true,
      receiptsEmail: true,
    },
  });

  const job = await t.findFirst<{
    jobNumber: number;
    customer: { name: string; phone: string | null; email: string | null };
    address: { line1: string; city: string; state: string; zip: string } | null;
  }>("job", {
    where: { id: jobId },
    select: {
      jobNumber: true,
      customer: { select: { name: true, phone: true, email: true } },
      address: { select: { line1: true, city: true, state: true, zip: true } },
    },
  });

  const lines = await t.findMany<{
    label: string;
    qty: number;
    unitCents: number;
    totalCents: number;
    unitLabel: string | null;
    description: string | null;
  }>("quoteLine", {
    where: { quoteId: quote.id },
  });

  const orgName = org?.name ?? "Service Provider";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const quoteUrl = `${appUrl}/quote/${viewToken}`;

  const createdDate = new Date(quote.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Build customer info section
  const customerName = job?.customer?.name ?? "";
  const customerPhone = job?.customer?.phone ?? "";
  const customerAddress = job?.address
    ? `${job.address.line1}, ${job.address.city}, ${job.address.state} ${job.address.zip}`
    : "";

  // Build email HTML — full itemized invoice
  const lineRows = lines
    .map((l) => {
      let qtyDisplay = "";
      if (l.unitLabel && l.unitLabel !== "flat" && l.qty > 0) {
        const singular = l.unitLabel.replace(/s$/, "");
        qtyDisplay = `<span style="color:#6b7280;font-size:12px;"> &mdash; ${l.qty} ${l.unitLabel} x ${formatCents(l.unitCents)}/${singular}</span>`;
      } else if (l.qty > 1) {
        qtyDisplay = ` x${l.qty}`;
      }

      const descRow = l.description
        ? `<tr><td colspan="2" style="padding:0 0 6px;color:#9ca3af;font-size:12px;word-break:break-word;">${l.description}</td></tr>`
        : "";

      return `<tr>
        <td style="padding:6px 0;${l.description ? "" : "border-bottom:1px solid #f0f0f0;"}color:#374151;font-size:14px;">
          ${l.label}${qtyDisplay}
        </td>
        <td style="padding:6px 0;${l.description ? "" : "border-bottom:1px solid #f0f0f0;"}text-align:right;color:#111827;font-weight:500;font-size:14px;white-space:nowrap;">
          ${formatCents(l.totalCents)}
        </td>
      </tr>${descRow}`;
    })
    .join("");

  const discountRow = quote.discountCents > 0
    ? `<tr>
        <td style="padding:4px 0;color:#dc2626;font-size:14px;">Discount${quote.discountReason ? ` (${quote.discountReason})` : ""}</td>
        <td style="padding:4px 0;text-align:right;color:#dc2626;font-size:14px;">-${formatCents(quote.discountCents)}</td>
      </tr>`
    : "";

  const taxRow = quote.taxCents > 0
    ? `<tr>
        <td style="padding:4px 0;color:#6b7280;font-size:14px;">Tax</td>
        <td style="padding:4px 0;text-align:right;color:#111827;font-size:14px;">${formatCents(quote.taxCents)}</td>
      </tr>`
    : "";

  const loadsNote = quote.truckLoads > 1
    ? `<p style="color:#6b7280;font-size:13px;margin:0 0 8px;">Truck loads: ${quote.truckLoads}</p>`
    : "";

  const notesSection = quote.notes
    ? `<div style="margin-top:16px;padding:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;">
        <p style="margin:0 0 4px;font-weight:700;font-size:11px;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;">Scope of Work / Notes</p>
        <p style="margin:0;color:#78350f;font-size:13px;line-height:1.5;white-space:pre-line;word-break:break-word;">${quote.notes}</p>
      </div>`
    : "";

  const contactLine = org?.receiptsEmail
    ? `<p style="text-align:center;color:#6b7280;font-size:12px;margin-top:8px;">Contact: ${org.receiptsEmail}</p>`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:24px;">
    <div style="background:#111827;border-radius:12px 12px 0 0;padding:32px 24px;text-align:center;">
      <h1 style="margin:0 0 8px;font-size:24px;color:#ffffff;">${orgName}</h1>
      <p style="margin:0;color:#9ca3af;font-size:14px;">Estimate</p>
    </div>
    <div style="background:#ffffff;border-radius:0 0 12px 12px;padding:24px;border:1px solid #e5e7eb;border-top:none;">
      <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
        <div>
          <p style="color:#6b7280;font-size:13px;margin:0;">Job #${job?.jobNumber ?? ""}</p>
          <p style="color:#6b7280;font-size:13px;margin:2px 0 0;">${createdDate}</p>
        </div>
      </div>

      ${customerName ? `<div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #e5e7eb;">
        <p style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Prepared for</p>
        <p style="margin:0;font-weight:600;color:#111827;">${customerName}</p>
        ${customerPhone ? `<p style="margin:2px 0 0;color:#6b7280;font-size:13px;">${customerPhone}</p>` : ""}
        ${customerAddress ? `<p style="margin:2px 0 0;color:#6b7280;font-size:13px;">${customerAddress}</p>` : ""}
      </div>` : ""}

      ${loadsNote}
      <table style="width:100%;border-collapse:collapse;">
        ${lineRows}
      </table>

      <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:14px;">
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

      ${notesSection}

      <div style="margin-top:24px;text-align:center;">
        <a href="${quoteUrl}" style="display:inline-block;background:#3e9c35;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          View Full Estimate
        </a>
      </div>

      <div style="margin-top:16px;padding:12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:10px;line-height:1.4;color:#6b7280;">
        <p style="margin:0 0 4px;font-weight:700;font-size:11px;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">Terms &amp; Conditions</p>
        <p style="margin:0 0 3px;">By accepting this estimate, you authorize ${orgName} to remove the items and/or materials identified above from the specified location.</p>
        <p style="margin:0 0 3px;"><strong>All sales are final.</strong> No refunds or chargebacks once work has commenced.</p>
        <p style="margin:0 0 3px;"><strong>Hazardous materials:</strong> Not covered unless explicitly listed.</p>
        <p style="margin:0;"><strong>Abandoned items:</strong> All removed items become property of ${orgName}.</p>
      </div>
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">
      Thank you for considering ${orgName}.
    </p>
    ${contactLine}
  </div>
</body>
</html>`;

  // Send email via Resend
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const fromAddress = process.env.RESEND_FROM || `receipts@${process.env.RESEND_DOMAIN || "resend.dev"}`;
    const displayName = org?.senderEmail || orgName;
    const from = `${displayName} <${fromAddress}>`;
    const replyTo = org?.receiptsEmail || undefined;

    // Non-production guard
    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
    let to = email;
    if (!isProduction) {
      const safe = process.env.RESEND_SAFE_RECIPIENT;
      if (!safe) {
        return NextResponse.json({ error: "Non-prod: no RESEND_SAFE_RECIPIENT set" }, { status: 500 });
      }
      to = safe;
    }

    const subjectBase = `Estimate from ${orgName} — Job #${job?.jobNumber ?? ""}`;
    const subject = isProduction ? subjectBase : `[preview] ${subjectBase}`;

    await resend.emails.send({ from, to, subject, html, replyTo });

    // Log
    await prisma.emailLog.create({
      data: {
        orgId: user.orgId,
        jobId,
        to: email,
        template: "quote_estimate",
        status: "sent",
      },
    });

    // Audit
    const { auditLog } = await import("@/lib/audit");
    await auditLog({
      orgId: user.orgId,
      actorUserId: user.id,
      action: "EMAIL_QUOTE",
      entity: "quote",
      entityId: quote.id,
      meta: { email, jobId },
    });

    return NextResponse.json({ ok: true, quoteUrl });
  } catch (err) {
    console.error("Failed to email quote:", err);
    await prisma.emailLog.create({
      data: {
        orgId: user.orgId,
        jobId,
        to: email,
        template: "quote_estimate",
        status: "failed",
      },
    });
    const message = err instanceof Error ? err.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
