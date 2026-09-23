/**
 * Google review request automation.
 * Sends review request emails after successful payment.
 * Anti-spam: max 1 per customer per 90 days, max 50 per org per day.
 */
import { prisma } from "./prisma";
import { sendReviewRequestEmail } from "./email";
import { auditLog } from "./audit";

export function buildGoogleReviewUrl(googlePlaceId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(googlePlaceId)}`;
}

export async function createAndSendReviewRequest(opts: {
  orgId: string;
  jobId: string;
  customerId: string;
  customerEmail: string;
  orgName: string;
  orgLogoUrl?: string | null;
  receiptsEmail?: string | null;
  googlePlaceId: string | null | undefined;
  reviewEnabled: boolean;
  actorUserId?: string;
}): Promise<void> {
  const {
    orgId, jobId, customerId, customerEmail,
    orgName, orgLogoUrl, receiptsEmail,
    googlePlaceId, reviewEnabled, actorUserId,
  } = opts;

  if (!reviewEnabled || !googlePlaceId) return;

  // Anti-spam: 1 per customer per 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const recent = await prisma.reviewRequest.findFirst({
    where: {
      orgId,
      customerId,
      createdAt: { gte: ninetyDaysAgo },
    },
  });
  if (recent) return;

  // Anti-spam: max 50 per org per day
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayCount = await prisma.reviewRequest.count({
    where: {
      orgId,
      createdAt: { gte: todayStart },
    },
  });
  if (todayCount >= 50) return;

  const reviewRequest = await prisma.reviewRequest.create({
    data: {
      orgId,
      jobId,
      customerId,
      status: "sent",
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const reviewLink = `${appUrl}/review/${reviewRequest.token}`;

  await sendReviewRequestEmail({
    orgId,
    jobId,
    orgName,
    orgLogoUrl,
    receiptsEmail,
    customerEmail,
    reviewLink,
  });

  await auditLog({
    orgId,
    actorUserId,
    action: "REVIEW_REQUEST_SENT",
    entity: "reviewRequest",
    entityId: reviewRequest.id,
    meta: { jobId, customerId },
  });
}
