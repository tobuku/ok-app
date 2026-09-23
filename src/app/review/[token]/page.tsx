/**
 * /review/[token] — Public review redirect page.
 * No auth required. Records click, then redirects to Google review URL.
 */
import { prisma } from "@/lib/prisma";
import { buildGoogleReviewUrl } from "@/lib/review";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReviewRedirectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const reviewRequest = await prisma.reviewRequest.findUnique({
    where: { token },
    include: {
      organization: {
        select: { googlePlaceId: true },
      },
    },
  });

  if (!reviewRequest || !reviewRequest.organization.googlePlaceId) {
    notFound();
  }

  // Record click if not already clicked
  if (!reviewRequest.clickedAt) {
    await prisma.reviewRequest.update({
      where: { id: reviewRequest.id },
      data: { status: "clicked", clickedAt: new Date() },
    });
  }

  redirect(buildGoogleReviewUrl(reviewRequest.organization.googlePlaceId));
}
