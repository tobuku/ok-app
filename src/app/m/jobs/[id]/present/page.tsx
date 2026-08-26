/**
 * /m/jobs/:id/present?quoteId=xxx
 * Leadman presents this screen to the customer.
 * Shows tenant-branded quote with Accept / Decline buttons.
 * NO platform branding — white-label per CLAUDE.md.
 */
import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tenantScope } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/format";
import { getSignedUrl } from "@/lib/storage";
import { AcceptDeclineButtons } from "./accept-decline-buttons";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PresentQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ quoteId?: string }>;
}) {
  const { id: jobId } = await params;
  const { quoteId } = await searchParams;
  const result = await resolveAuth();
  if (!result.ok) redirect("/login");
  if (!("user" in result)) redirect("/platform");
  const { user } = result;

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: { name: true, logoKey: true, taxRateBps: true },
  });
  if (!org) redirect("/m");

  let logoUrl: string | null = null;
  if (org.logoKey) {
    logoUrl = await getSignedUrl(org.logoKey);
  }

  let quoteWhere: Record<string, unknown> = { jobId };
  if (quoteId) quoteWhere = { id: quoteId };

  const quote = await t.findFirst<{
    id: string;
    status: string;
    subtotalCents: number;
    discountCents: number;
    discountReason: string | null;
    taxCents: number;
    totalCents: number;
  }>("quote", {
    where: quoteWhere,
    orderBy: { createdAt: "desc" },
  });

  if (!quote) redirect(`/m/jobs/${jobId}`);

  const lines = await t.findMany<{
    id: string;
    label: string;
    qty: number;
    unitCents: number;
    totalCents: number;
  }>("quoteLine", {
    where: { quoteId: quote.id },
  });

  let quoteStatus = quote.status;
  if (quoteStatus === "DRAFT") {
    await t.update("quote", {
      where: { id: quote.id },
      data: { status: "PRESENTED" },
    });
    quoteStatus = "PRESENTED";
  }

  const isPresented = quoteStatus === "PRESENTED";

  return (
    <div className="min-h-screen bg-background flex items-start justify-center p-4">
      <div className="bg-card rounded-2xl shadow-lg max-w-md w-full overflow-hidden border border-border">
        {/* Tenant branding header — NO platform branding */}
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
          <p className="text-muted-foreground text-sm mt-2">Service Quote</p>
        </div>

        {/* Quote breakdown */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            {lines.map((line) => (
              <div key={line.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {line.label}
                  {line.qty > 1 && ` x${line.qty}`}
                </span>
                <span className="font-medium font-mono">{formatCents(line.totalCents)}</span>
              </div>
            ))}
          </div>

          <Separator />

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

          {/* Accept / Decline buttons — only if quote is presented */}
          {isPresented ? (
            <AcceptDeclineButtons quoteId={quote.id} jobId={jobId} />
          ) : quoteStatus === "ACCEPTED" ? (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-1" />
              <p className="text-green-800 dark:text-green-400 font-medium text-lg">Quote Accepted</p>
              <p className="text-green-600 dark:text-green-500 text-sm mt-1">Thank you</p>
            </div>
          ) : quoteStatus === "DECLINED" ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
              <XCircle className="h-6 w-6 text-red-600 mx-auto mb-1" />
              <p className="text-red-800 dark:text-red-400 font-medium">Quote Declined</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
