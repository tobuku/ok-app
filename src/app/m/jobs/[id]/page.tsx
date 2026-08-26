import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tenantScope } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { canTransition } from "@/lib/status";
import Link from "next/link";
import type { JobStatus } from "@prisma/client";
import { ArrowLeft, Phone, MapPin } from "lucide-react";
import { MobileStatusButton } from "./mobile-status-button";
import { PhotoCapture } from "./photo-capture";
import { PhotoGallery } from "./photo-gallery";
import { QuoteBuilder } from "./quote-builder";
import { PaymentButtons } from "./payment-buttons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, getStatusLabel } from "@/components/status-badge";
import { CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

const LEADMAN_FLOW: JobStatus[] = [
  "EN_ROUTE", "ON_SITE", "IN_PROGRESS", "COMPLETED",
];

export default async function MobileJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await resolveAuth();
  if (!result.ok) redirect("/login");
  if (!("user" in result)) redirect("/platform");
  const { user } = result;

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: { taxRateBps: true, stripeConnectAccountId: true },
  });

  const where: Record<string, unknown> = { id };
  if (user.role === "LEADMAN") where.assignedToId = user.id;

  const job = await t.findFirst("job", {
    where,
    include: {
      customer: true,
      address: true,
    },
  }) as {
    id: string;
    jobNumber: number;
    status: JobStatus;
    scheduledDate: string | null;
    notes: string | null;
    enRouteAt: string | null;
    onSiteAt: string | null;
    completedAt: string | null;
    customer: { name: string; phone: string | null; email: string | null };
    address: { line1: string; line2: string | null; city: string; state: string; zip: string } | null;
  } | null;

  if (!job) redirect("/m");

  let acceptedQuoteTotal = 0;
  if (job.status === "COMPLETED") {
    const acceptedQuote = await t.findFirst<{ totalCents: number }>("quote", {
      where: { jobId: id, status: "ACCEPTED" },
      select: { totalCents: true },
    });
    acceptedQuoteTotal = acceptedQuote?.totalCents ?? 0;
  }

  const nextForward = LEADMAN_FLOW.find((s) => canTransition(job.status, s));
  const canCancel = canTransition(job.status, "CANCELED");

  const addressStr = job.address
    ? `${job.address.line1}, ${job.address.city}, ${job.address.state} ${job.address.zip}`
    : null;
  const mapsUrl = addressStr
    ? `https://maps.google.com/?q=${encodeURIComponent(addressStr)}`
    : null;

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/m">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Link>
      </Button>

      <Card>
        <CardContent className="pt-5 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-muted-foreground">#{job.jobNumber}</span>
            <StatusBadge status={job.status} />
          </div>

          {/* Customer */}
          <div>
            <h1 className="text-xl font-bold">{job.customer.name}</h1>
            {job.customer.phone && (
              <a href={`tel:${job.customer.phone}`} className="text-sm text-primary flex items-center gap-1 mt-1">
                <Phone className="h-3.5 w-3.5" />
                {job.customer.phone}
              </a>
            )}
          </div>

          {/* Address */}
          {job.address && (
            <div>
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline flex items-center gap-1"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {job.address.line1}
                  {job.address.line2 ? `, ${job.address.line2}` : ""},{" "}
                  {job.address.city}, {job.address.state} {job.address.zip}
                </a>
              ) : (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {job.address.line1}, {job.address.city}, {job.address.state} {job.address.zip}
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          {job.notes && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{job.notes}</p>
            </div>
          )}

          {/* Timestamps */}
          {(job.enRouteAt || job.onSiteAt || job.completedAt) && (
            <div className="text-xs text-muted-foreground space-y-1">
              {job.enRouteAt && <p>En route: {new Date(job.enRouteAt).toLocaleTimeString()}</p>}
              {job.onSiteAt && <p>On site: {new Date(job.onSiteAt).toLocaleTimeString()}</p>}
              {job.completedAt && <p>Completed: {new Date(job.completedAt).toLocaleTimeString()}</p>}
            </div>
          )}

          {/* Photos */}
          <PhotoGallery jobId={job.id} />

          {/* Photo capture */}
          {["ON_SITE", "QUOTED", "ACCEPTED", "DECLINED", "IN_PROGRESS", "COMPLETED"].includes(job.status) && (
            <div className="space-y-2">
              {["ON_SITE", "QUOTED", "ACCEPTED", "DECLINED"].includes(job.status) && (
                <PhotoCapture jobId={job.id} type="before" />
              )}
              {["IN_PROGRESS", "COMPLETED"].includes(job.status) && (
                <PhotoCapture jobId={job.id} type="after" />
              )}
            </div>
          )}

          {/* Quote builder */}
          <QuoteBuilder
            jobId={job.id}
            jobStatus={job.status}
            taxRateBps={org?.taxRateBps ?? 0}
          />

          {/* Payment */}
          {job.status === "COMPLETED" && acceptedQuoteTotal > 0 && (
            <PaymentButtons
              jobId={job.id}
              totalCents={acceptedQuoteTotal}
              stripeConnected={!!org?.stripeConnectAccountId}
            />
          )}

          {/* Paid confirmation */}
          {job.status === "PAID" && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-1" />
              <p className="text-green-800 dark:text-green-400 font-medium text-lg">Paid</p>
              <p className="text-green-600 dark:text-green-500 text-sm mt-1">Job complete</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3 pt-2">
            {nextForward && (
              <MobileStatusButton
                jobId={job.id}
                newStatus={nextForward}
                label={getStatusLabel(nextForward)}
                primary
              />
            )}
            {canCancel && (
              <MobileStatusButton
                jobId={job.id}
                newStatus="CANCELED"
                label="Cancel Job"
                primary={false}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
