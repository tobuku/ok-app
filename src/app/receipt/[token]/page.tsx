/**
 * /receipt/[token] — Public receipt page for customers.
 * No auth required. White-labeled with tenant branding.
 */
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/format";
import { getSignedUrl } from "@/lib/storage";
import { notFound } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Star } from "lucide-react";
import { buildGoogleReviewUrl } from "@/lib/review";

export const dynamic = "force-dynamic";

export default async function PublicReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const payment = await prisma.payment.findUnique({
    where: { receiptToken: token },
    include: {
      job: {
        select: {
          jobNumber: true,
          customer: { select: { name: true } },
        },
      },
      quote: {
        include: { lines: true },
      },
      organization: {
        select: { name: true, logoKey: true, reviewEnabled: true, googlePlaceId: true },
      },
    },
  });

  if (!payment || payment.status !== "SUCCEEDED") notFound();

  const org = payment.organization;
  let logoUrl: string | null = null;
  if (org.logoKey) {
    logoUrl = await getSignedUrl(org.logoKey);
  }

  const paidDate = payment.paidAt
    ? new Date(payment.paidAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const methodLabel =
    payment.method === "CARD"
      ? "Card"
      : payment.method === "CHECK"
        ? "Check"
        : "Cash";

  return (
    <div className="min-h-screen bg-background flex items-start justify-center p-4">
      <div className="bg-card rounded-2xl shadow-lg max-w-md w-full overflow-hidden border border-border">
        {/* Tenant branding header */}
        <div className="bg-foreground px-6 py-8 text-center">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={org.name}
              className="h-16 mx-auto mb-3 object-contain"
            />
          ) : (
            <h1 className="text-2xl font-bold text-background">{org.name}</h1>
          )}
          <p className="text-muted-foreground text-sm mt-2">Payment Receipt</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Job #{payment.job.jobNumber}</span>
            {paidDate && <span>{paidDate}</span>}
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Customer</p>
            <p className="font-medium">{payment.job.customer.name}</p>
          </div>

          <Separator />

          {/* Line items from quote */}
          {payment.quote && (
            <>
              <div className="space-y-2">
                {payment.quote.lines.map((line) => (
                  <div key={line.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {line.label}
                      {line.qty > 1 && ` x${line.qty}`}
                    </span>
                    <span className="font-medium font-mono">
                      {formatCents(line.totalCents)}
                    </span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono">
                    {formatCents(payment.quote.subtotalCents)}
                  </span>
                </div>
                {payment.quote.discountCents > 0 && (
                  <div className="flex justify-between text-sm text-red-600 dark:text-red-400">
                    <span>
                      Discount
                      {payment.quote.discountReason && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({payment.quote.discountReason})
                        </span>
                      )}
                    </span>
                    <span>-{formatCents(payment.quote.discountCents)}</span>
                  </div>
                )}
                {payment.quote.taxCents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-mono">
                      {formatCents(payment.quote.taxCents)}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold pt-2">
                  <span>Total</span>
                  <span className="font-mono">
                    {formatCents(payment.quote.totalCents)}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* If no quote, just show the amount */}
          {!payment.quote && (
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="font-mono">
                {formatCents(payment.amountCents)}
              </span>
            </div>
          )}

          {/* Payment confirmation */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-1" />
            <p className="text-green-800 dark:text-green-400 font-medium text-lg">
              Paid by {methodLabel}
            </p>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Thank you for your business.
          </p>

          {org.reviewEnabled && org.googlePlaceId && (
            <div className="pt-2 text-center">
              <a
                href={buildGoogleReviewUrl(org.googlePlaceId)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors"
              >
                <Star className="h-4 w-4" />
                Leave a Review
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
