/**
 * White-labeled receipt email via Resend.
 * Sends tenant-branded invoice receipt to the customer AND the company's receiptsEmail.
 * NO platform branding — white-label per CLAUDE.md.
 */
import { Resend } from "resend";
import { prisma } from "./prisma";
import { formatCents } from "./format";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

type ReceiptLine = {
  label: string;
  qty: number;
  totalCents: number;
};

type ReceiptData = {
  orgId: string;
  jobId: string;
  orgName: string;
  orgLogoUrl?: string | null;
  senderEmail?: string | null;
  receiptsEmail?: string | null;
  customerEmail: string;
  jobNumber: number;
  lines: ReceiptLine[];
  subtotalCents: number;
  discountCents: number;
  discountReason?: string | null;
  taxCents: number;
  totalCents: number;
  paymentMethod: "CARD" | "CASH";
  paidAt: Date;
};

function buildReceiptHtml(data: ReceiptData): string {
  const lineRows = data.lines
    .map(
      (l) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#374151;">
          ${l.label}${l.qty > 1 ? ` x${l.qty}` : ""}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;color:#111827;font-weight:500;">
          ${formatCents(l.totalCents)}
        </td>
      </tr>`
    )
    .join("");

  const logoHtml = data.orgLogoUrl
    ? `<img src="${data.orgLogoUrl}" alt="${data.orgName}" style="max-height:60px;margin:0 auto 12px;" />`
    : `<h1 style="margin:0 0 8px;font-size:24px;color:#ffffff;">${data.orgName}</h1>`;

  const discountRow =
    data.discountCents > 0
      ? `<tr>
          <td style="padding:4px 0;color:#dc2626;">Discount${data.discountReason ? ` (${data.discountReason})` : ""}</td>
          <td style="padding:4px 0;text-align:right;color:#dc2626;">-${formatCents(data.discountCents)}</td>
        </tr>`
      : "";

  const taxRow =
    data.taxCents > 0
      ? `<tr>
          <td style="padding:4px 0;color:#6b7280;">Tax</td>
          <td style="padding:4px 0;text-align:right;color:#111827;">${formatCents(data.taxCents)}</td>
        </tr>`
      : "";

  const paidDate = data.paidAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:24px;">
    <!-- Tenant branding header -->
    <div style="background:#111827;border-radius:12px 12px 0 0;padding:32px 24px;text-align:center;">
      ${logoHtml}
      <p style="margin:0;color:#9ca3af;font-size:14px;">Payment Receipt</p>
    </div>

    <div style="background:#ffffff;border-radius:0 0 12px 12px;padding:24px;border:1px solid #e5e7eb;border-top:none;">
      <p style="color:#6b7280;font-size:14px;margin:0 0 4px;">Job #${data.jobNumber}</p>
      <p style="color:#6b7280;font-size:14px;margin:0 0 16px;">${paidDate}</p>

      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${lineRows}
      </table>

      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px;">
        <tr>
          <td style="padding:4px 0;color:#6b7280;">Subtotal</td>
          <td style="padding:4px 0;text-align:right;color:#111827;">${formatCents(data.subtotalCents)}</td>
        </tr>
        ${discountRow}
        ${taxRow}
        <tr>
          <td style="padding:12px 0 4px;font-size:18px;font-weight:700;color:#111827;border-top:2px solid #e5e7eb;">Total</td>
          <td style="padding:12px 0 4px;font-size:18px;font-weight:700;text-align:right;color:#111827;border-top:2px solid #e5e7eb;">${formatCents(data.totalCents)}</td>
        </tr>
      </table>

      <div style="margin-top:16px;padding:12px;background:#f0fdf4;border-radius:8px;text-align:center;">
        <p style="margin:0;color:#166534;font-weight:600;">Paid by ${data.paymentMethod === "CARD" ? "Card" : "Cash"}</p>
      </div>
    </div>

    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">
      Thank you for your business.
    </p>
  </div>
</body>
</html>`;
}

/**
 * Send white-labeled receipt to the customer AND company receiptsEmail.
 * Logs to EmailLog.
 */
/**
 * Send an org admin invite email from the platform.
 * The invite links to /onboarding?token=<invite token>.
 */
export async function sendOrgInvite(opts: {
  to: string;
  orgName: string;
  inviteToken: string;
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteUrl = `${appUrl}/onboarding?token=${opts.inviteToken}`;

  const fromAddress = process.env.RESEND_FROM || `noreply@${process.env.RESEND_DOMAIN || "resend.dev"}`;
  const from = `Platform <${fromAddress}>`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:24px;">
    <div style="background:#ffffff;border-radius:12px;padding:32px 24px;border:1px solid #e5e7eb;">
      <h1 style="margin:0 0 16px;font-size:22px;color:#111827;">You're invited to set up ${opts.orgName}</h1>
      <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Your organization has been created on our junk removal platform. Click below to complete setup — you'll configure branding, pricing, invite your team, and connect Stripe.
      </p>
      <a href="${inviteUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
        Complete Setup
      </a>
      <p style="color:#9ca3af;font-size:12px;margin:24px 0 0;">
        This invite link is valid for 7 days.
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    await getResend().emails.send({
      from,
      to: opts.to,
      subject: `Set up ${opts.orgName} — You're Invited`,
      html,
    });

    await prisma.emailLog.create({
      data: { to: opts.to, template: "org_invite", status: "sent" },
    });
  } catch (err) {
    console.error(`Failed to send org invite to ${opts.to}:`, err);
    await prisma.emailLog.create({
      data: { to: opts.to, template: "org_invite", status: "failed" },
    });
  }
}

export async function sendReceipt(data: ReceiptData): Promise<void> {
  const html = buildReceiptHtml(data);
  const subject = `Receipt — ${data.orgName} Job #${data.jobNumber}`;

  // From address: use org's senderEmail if set (requires verified domain in Resend),
  // otherwise fall back to RESEND_FROM env var (sandbox: onboarding@resend.dev)
  const platformDefault = process.env.RESEND_FROM || `receipts@${process.env.RESEND_DOMAIN || "resend.dev"}`;
  const fromAddress = data.senderEmail || platformDefault;
  const from = `${data.orgName} <${fromAddress}>`;
  const replyTo = data.receiptsEmail || undefined;

  const recipients: string[] = [data.customerEmail];
  if (data.receiptsEmail && data.receiptsEmail !== data.customerEmail) {
    recipients.push(data.receiptsEmail);
  }

  for (const to of recipients) {
    try {
      await getResend().emails.send({ from, to, subject, html, replyTo });

      await prisma.emailLog.create({
        data: {
          orgId: data.orgId,
          jobId: data.jobId,
          to,
          template: "receipt",
          status: "sent",
        },
      });
    } catch (err) {
      console.error(`Failed to send receipt to ${to}:`, err);
      await prisma.emailLog.create({
        data: {
          orgId: data.orgId,
          jobId: data.jobId,
          to,
          template: "receipt",
          status: "failed",
        },
      });
    }
  }
}
