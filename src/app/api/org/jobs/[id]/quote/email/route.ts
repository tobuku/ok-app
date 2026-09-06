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

  const job = await t.findFirst<{ jobNumber: number }>("job", {
    where: { id: jobId },
    select: { jobNumber: true },
  });

  const lines = await t.findMany<{
    label: string;
    qty: number;
    totalCents: number;
  }>("quoteLine", {
    where: { quoteId: quote.id },
  });

  const orgName = org?.name ?? "Service Provider";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const quoteUrl = `${appUrl}/quote/${viewToken}`;

  // Build email HTML
  const lineRows = lines
    .map(
      (l) => `<tr>
        <td style="padding:6px 0;border-bottom:1px solid #f0f0f0;color:#374151;font-size:14px;">
          ${l.label}${l.qty > 1 ? ` x${l.qty}` : ""}
        </td>
        <td style="padding:6px 0;border-bottom:1px solid #f0f0f0;text-align:right;color:#111827;font-weight:500;font-size:14px;">
          ${formatCents(l.totalCents)}
        </td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:24px;">
    <div style="background:#111827;border-radius:12px 12px 0 0;padding:32px 24px;text-align:center;">
      <h1 style="margin:0 0 8px;font-size:24px;color:#ffffff;">${orgName}</h1>
      <p style="margin:0;color:#9ca3af;font-size:14px;">Estimate — Job #${job?.jobNumber ?? ""}</p>
    </div>
    <div style="background:#ffffff;border-radius:0 0 12px 12px;padding:24px;border:1px solid #e5e7eb;border-top:none;">
      <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px;">
        Thank you for your interest. Please find your estimate below.
      </p>

      <table style="width:100%;border-collapse:collapse;">
        ${lineRows}
      </table>

      <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:14px;">
        <tr>
          <td style="padding:12px 0 4px;font-size:18px;font-weight:700;color:#111827;border-top:2px solid #e5e7eb;">Total</td>
          <td style="padding:12px 0 4px;font-size:18px;font-weight:700;text-align:right;color:#111827;border-top:2px solid #e5e7eb;">${formatCents(quote.totalCents)}</td>
        </tr>
      </table>

      <div style="margin-top:24px;text-align:center;">
        <a href="${quoteUrl}" style="display:inline-block;background:#3e9c35;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          View Full Estimate
        </a>
      </div>

      <p style="color:#9ca3af;font-size:12px;margin:20px 0 0;text-align:center;line-height:1.5;">
        This estimate is for review only. Acceptance and payment are completed in person with your service crew.
      </p>
    </div>
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
