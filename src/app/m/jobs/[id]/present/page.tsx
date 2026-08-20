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

  // Load org branding
  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: { name: true, logoKey: true, taxRateBps: true },
  });
  if (!org) redirect("/m");

  // Get logo URL if exists
  let logoUrl: string | null = null;
  if (org.logoKey) {
    logoUrl = await getSignedUrl(org.logoKey);
  }

  // Load quote
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

  // Load quote lines
  const lines = await t.findMany<{
    id: string;
    label: string;
    qty: number;
    unitCents: number;
    totalCents: number;
  }>("quoteLine", {
    where: { quoteId: quote.id },
  });

  // Auto-present if still draft
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
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full overflow-hidden">
        {/* Tenant branding header — NO platform branding */}
        <div className="bg-gray-900 px-6 py-8 text-center">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={org.name}
              className="h-16 mx-auto mb-3 object-contain"
            />
          ) : (
            <h1 className="text-2xl font-bold text-white">{org.name}</h1>
          )}
          <p className="text-gray-400 text-sm mt-2">Service Quote</p>
        </div>

        {/* Quote breakdown */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            {lines.map((line) => (
              <div key={line.id} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {line.label}
                  {line.qty > 1 && ` x${line.qty}`}
                </span>
                <span className="font-medium">{formatCents(line.totalCents)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatCents(quote.subtotalCents)}</span>
            </div>
            {quote.discountCents > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>
                  Discount
                  {quote.discountReason && (
                    <span className="text-xs text-gray-400 ml-1">
                      ({quote.discountReason})
                    </span>
                  )}
                </span>
                <span>-{formatCents(quote.discountCents)}</span>
              </div>
            )}
            {quote.taxCents > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Tax</span>
                <span>{formatCents(quote.taxCents)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-100">
              <span>Total</span>
              <span>{formatCents(quote.totalCents)}</span>
            </div>
          </div>

          {/* Accept / Decline buttons — only if quote is presented */}
          {isPresented ? (
            <AcceptDeclineButtons quoteId={quote.id} jobId={jobId} />
          ) : quoteStatus === "ACCEPTED" ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-green-800 font-medium text-lg">Quote Accepted</p>
              <p className="text-green-600 text-sm mt-1">Thank you</p>
            </div>
          ) : quoteStatus === "DECLINED" ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-800 font-medium">Quote Declined</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
