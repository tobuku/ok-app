import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tenantScope } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { canTransition } from "@/lib/status";
import Link from "next/link";
import type { JobStatus } from "@prisma/client";
import { ArrowLeft, Phone, MapPin, AlertTriangle } from "lucide-react";
import { MobileStatusButton } from "./mobile-status-button";
import { PhotoCapture } from "./photo-capture";
import { PhotoGallery } from "./photo-gallery";
import { QuoteBuilder } from "./quote-builder";
import { PaymentButtons } from "./payment-buttons";
import { JobNotes } from "./job-notes";
import { JobTimer } from "./job-timer";
import { InvoiceActions } from "./invoice-actions";
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
    select: { name: true, taxRateBps: true, stripeConnectAccountId: true },
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
    addressId: string | null;
    enRouteAt: string | null;
    onSiteAt: string | null;
    completedAt: string | null;
    customer: { name: string; phone: string | null; email: string | null };
    address: { id: string; line1: string; line2: string | null; city: string; state: string; zip: string } | null;
  } | null;

  if (!job) redirect("/m");

  // Get accepted quote for payment or invoice
  let acceptedQuoteTotal = 0;
  let acceptedQuoteId: string | null = null;
  const acceptedQuote = await t.findFirst<{ id: string; totalCents: number; customerEmail: string | null }>("quote", {
    where: { jobId: id, status: "ACCEPTED" },
    select: { id: true, totalCents: true, customerEmail: true },
  });
  if (acceptedQuote) {
    acceptedQuoteTotal = acceptedQuote.totalCents;
    acceptedQuoteId = acceptedQuote.id;
  }

  // Address warnings from past jobs
  let addressWarnings: { note: string; createdAt: Date }[] = [];
  if (job.addressId) {
    addressWarnings = await t.findMany<{ note: string; createdAt: Date }>("addressNote", {
      where: { addressId: job.addressId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
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
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold">{job.customer.name}</h1>
              {job.customer.phone && (
                <a href={`tel:${job.customer.phone}`} className="text-sm text-primary flex items-center gap-1 mt-1">
                  <Phone className="h-3.5 w-3.5" />
                  {job.customer.phone}
                </a>
              )}
            </div>
            {/* SMS notify button (#8) */}
            {job.customer.phone && ["EN_ROUTE", "COMPLETED"].includes(job.status) && (
              <SmsNotifyLink
                phone={job.customer.phone}
                status={job.status}
                orgName={org?.name ?? ""}
              />
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

          {/* Address warnings (#4) */}
          {addressWarnings.length > 0 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <p className="text-xs font-medium text-yellow-800 dark:text-yellow-400 uppercase mb-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Address Warnings
              </p>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                {addressWarnings.map((w, i) => (
                  <li key={i}>{w.note}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Dispatcher notes */}
          {job.notes && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Dispatch Notes</p>
              <p className="text-sm whitespace-pre-wrap">{job.notes}</p>
            </div>
          )}

          {/* Job notes log (#1) — append-only notes */}
          <JobNotes
            jobId={job.id}
            addressId={job.addressId}
            jobStatus={job.status}
          />

          {/* Job timer (#7) */}
          {job.onSiteAt && !job.completedAt && (
            <JobTimer onSiteAt={job.onSiteAt} />
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

          {/* Photo capture — BEFORE on site, AFTER after payment */}
          {["ON_SITE", "QUOTED", "ACCEPTED", "DECLINED", "PAID", "IN_PROGRESS", "COMPLETED"].includes(job.status) && (
            <div className="space-y-2">
              {["ON_SITE", "QUOTED", "ACCEPTED", "DECLINED"].includes(job.status) && (
                <PhotoCapture jobId={job.id} type="before" />
              )}
              {["PAID", "IN_PROGRESS", "COMPLETED"].includes(job.status) && (
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

          {/* Payment — now on ACCEPTED status (pay before loading) (#2) */}
          {job.status === "ACCEPTED" && acceptedQuoteTotal > 0 && (
            <PaymentButtons
              jobId={job.id}
              totalCents={acceptedQuoteTotal}
              stripeConnected={!!org?.stripeConnectAccountId}
            />
          )}

          {/* Paid confirmation + invoice actions (#3) */}
          {job.status === "PAID" && (
            <div className="space-y-3">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-1" />
                <p className="text-green-800 dark:text-green-400 font-medium text-lg">Paid</p>
                <p className="text-green-600 dark:text-green-500 text-sm mt-1">Ready to load</p>
              </div>
              {acceptedQuoteId && (
                <InvoiceActions jobId={job.id} orgName={org?.name ?? ""} />
              )}
            </div>
          )}

          {/* Completed confirmation */}
          {job.status === "COMPLETED" && (
            <div className="space-y-3">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-1" />
                <p className="text-green-800 dark:text-green-400 font-medium text-lg">Job Complete</p>
              </div>
              {acceptedQuoteId && (
                <InvoiceActions jobId={job.id} orgName={org?.name ?? ""} />
              )}
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

/** SMS notify link — opens native SMS app with pre-filled message (#8) */
function SmsNotifyLink({
  phone,
  status,
  orgName,
}: {
  phone: string;
  status: string;
  orgName: string;
}) {
  const messages: Record<string, string> = {
    EN_ROUTE: `Hi! Your ${orgName} crew is on the way.`,
    COMPLETED: `Your ${orgName} job is complete. Thank you!`,
  };
  const msg = messages[status] || "";
  const digits = phone.replace(/\D/g, "");
  const href = `sms:${digits}?body=${encodeURIComponent(msg)}`;

  return (
    <a
      href={href}
      className="text-xs text-primary underline whitespace-nowrap"
    >
      Notify
    </a>
  );
}
