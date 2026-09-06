/**
 * /quote/[token] — Public, view-only quote page for customers.
 * No auth required. White-labeled with tenant branding.
 * Customer can review but NOT accept/sign from here — must sign in person.
 */
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/format";
import { getSignedUrl } from "@/lib/storage";
import { notFound } from "next/navigation";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const quote = await prisma.quote.findUnique({
    where: { viewToken: token },
    include: {
      lines: true,
      job: { select: { jobNumber: true, customer: { select: { name: true } } } },
      organization: { select: { name: true, logoKey: true } },
    },
  });

  if (!quote) notFound();

  const org = quote.organization;
  let logoUrl: string | null = null;
  if (org.logoKey) {
    logoUrl = await getSignedUrl(org.logoKey);
  }

  const createdDate = new Date(quote.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

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
          <p className="text-muted-foreground text-sm mt-2">Estimate</p>
        </div>

        {/* Quote details */}
        <div className="p-6 space-y-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Job #{quote.job.jobNumber}</span>
            <span>{createdDate}</span>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Prepared for</p>
            <p className="font-medium">{quote.job.customer.name}</p>
          </div>

          <Separator />

          {/* Line items */}
          <div className="space-y-2">
            {quote.lines.map((line) => (
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

          {quote.truckLoads > 1 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Truck loads</span>
              <span className="font-medium">{quote.truckLoads}</span>
            </div>
          )}

          <Separator />

          {/* Totals */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono">{formatCents(quote.subtotalCents)}</span>
            </div>
            {quote.discountCents > 0 && (
              <div className="flex justify-between text-sm text-red-600 dark:text-red-400">
                <span>
                  Discount
                  {quote.discountReason && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({quote.discountReason})
                    </span>
                  )}
                </span>
                <span>-{formatCents(quote.discountCents)}</span>
              </div>
            )}
            {quote.taxCents > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-mono">{formatCents(quote.taxCents)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold pt-2">
              <span>Total</span>
              <span className="font-mono">{formatCents(quote.totalCents)}</span>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="text-[10px] leading-tight text-muted-foreground border border-border rounded-md p-3 space-y-1.5 bg-muted/30">
            <p className="font-semibold text-xs text-foreground uppercase tracking-wide mb-1">Terms & Conditions</p>
            <p>By accepting this quote, you authorize {org.name} to remove the items and/or materials identified above from the specified location.</p>
            <p><strong>All sales are final.</strong> No refunds or chargebacks will be issued once work has commenced.</p>
            <p><strong>Damage disclaimer:</strong> {org.name} will exercise reasonable care during removal. However, we are not liable for pre-existing damage, cosmetic wear to surfaces (walls, floors, doorways, landscaping) incurred during the removal of heavy, oversized, or awkwardly placed items, or for damage to items not included in this quote that are in the removal path.</p>
            <p><strong>Hazardous materials:</strong> This quote does not cover hazardous, biohazard, or regulated materials unless explicitly listed.</p>
            <p><strong>Abandoned items:</strong> All removed items become the property of {org.name} for disposal, recycling, or resale.</p>
          </div>

          {/* Note about in-person signing */}
          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">
              This estimate is for review only. Acceptance and payment are completed in person with your service crew.
            </p>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Questions? Contact {org.name} directly.
          </p>
        </div>
      </div>
    </div>
  );
}
