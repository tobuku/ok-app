import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tenantScope } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { formatDate, formatCents } from "@/lib/format";
import { canTransition } from "@/lib/status";
import { getSignedUrls } from "@/lib/storage";
import Link from "next/link";
import type { JobStatus } from "@prisma/client";
import { ArrowLeft, Clock, MapPin, User, FileText, Camera, CreditCard, RotateCcw } from "lucide-react";
import { JobStatusButton } from "./status-button";
import { JobEditForm } from "./edit-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, getStatusLabel } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

const ALL_STATUSES: JobStatus[] = [
  "NEW", "SCHEDULED", "EN_ROUTE", "ON_SITE", "QUOTED", "ACCEPTED",
  "DECLINED", "IN_PROGRESS", "COMPLETED", "PAID", "CANCELED",
];

export default async function JobDetailPage({
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
  const job = await t.findFirst("job", {
    where: { id },
    include: {
      customer: true,
      address: true,
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  }) as {
    id: string;
    jobNumber: number;
    status: JobStatus;
    scheduledDate: string | null;
    timeWindowStart: string | null;
    timeWindowEnd: string | null;
    notes: string | null;
    source: string;
    assignedToId: string | null;
    truckId: string | null;
    customerId: string;
    addressId: string | null;
    enRouteAt: string | null;
    onSiteAt: string | null;
    completedAt: string | null;
    canceledAt: string | null;
    cancelReason: string | null;
    customer: { id: string; name: string; phone: string | null; email: string | null };
    address: { line1: string; line2: string | null; city: string; state: string; zip: string } | null;
    assignedTo: { id: string; name: string } | null;
    createdBy: { id: string; name: string };
  } | null;

  if (!job) redirect("/app");

  const transitions = ALL_STATUSES.filter((s) => canTransition(job.status, s));

  const orgUsers = await prisma.user.findMany({
    where: { orgId: user.orgId, active: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
  const leadmen = orgUsers.filter((u) => u.role === "LEADMAN");

  const photos = await t.findMany<{
    id: string;
    type: string;
    storageKey: string;
  }>("photo", {
    where: { jobId: job.id },
    orderBy: { takenAt: "asc" },
  });
  const photoUrls = await getSignedUrls(photos.map((p) => p.storageKey));
  const beforePhotos = photos.filter((p) => p.type === "BEFORE");
  const afterPhotos = photos.filter((p) => p.type === "AFTER");

  const quotes = await t.findMany<{
    id: string;
    status: string;
    totalCents: number;
  }>("quote", {
    where: { jobId: job.id },
    orderBy: { createdAt: "desc" },
    take: 1,
  });
  const latestQuote = quotes[0] ?? null;

  const quoteLines = latestQuote
    ? await t.findMany<{
        id: string;
        label: string;
        qty: number;
        totalCents: number;
      }>("quoteLine", { where: { quoteId: latestQuote.id } })
    : [];

  const payments = await t.findMany<{
    id: string;
    method: string;
    status: string;
    amountCents: number;
    paidAt: string | null;
  }>("payment", {
    where: { jobId: job.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-4xl">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/app">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to board
        </Link>
      </Button>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Job #{job.jobNumber}</h1>
        <StatusBadge status={job.status} />
      </div>

      {/* Status transitions */}
      {transitions.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {transitions.map((s) => (
            <JobStatusButton
              key={s}
              jobId={job.id}
              newStatus={s}
              label={getStatusLabel(s)}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium">{job.customer.name}</p>
              {job.customer.phone && <p className="text-muted-foreground">{job.customer.phone}</p>}
              {job.customer.email && <p className="text-muted-foreground">{job.customer.email}</p>}
              {job.address && (
                <p className="text-muted-foreground flex items-start gap-1 mt-2">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  {job.address.line1}
                  {job.address.line2 ? `, ${job.address.line2}` : ""},{" "}
                  {job.address.city}, {job.address.state} {job.address.zip}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Photos */}
          {photos.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Photos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {beforePhotos.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Before ({beforePhotos.length})</p>
                    <div className="flex gap-2 flex-wrap">
                      {beforePhotos.map((p) => (
                        <a key={p.id} href={photoUrls[p.storageKey] ?? "#"} target="_blank" rel="noopener noreferrer">
                          <img src={photoUrls[p.storageKey] ?? ""} alt="Before" className="w-24 h-24 object-cover rounded-md border border-border" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {afterPhotos.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">After ({afterPhotos.length})</p>
                    <div className="flex gap-2 flex-wrap">
                      {afterPhotos.map((p) => (
                        <a key={p.id} href={photoUrls[p.storageKey] ?? "#"} target="_blank" rel="noopener noreferrer">
                          <img src={photoUrls[p.storageKey] ?? ""} alt="After" className="w-24 h-24 object-cover rounded-md border border-border" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quote */}
          {latestQuote && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Quote
                  <Badge variant="secondary" className="ml-1">{latestQuote.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1.5">
                  {quoteLines.map((line) => (
                    <div key={line.id} className="flex justify-between">
                      <span className="text-muted-foreground">{line.label}{line.qty > 1 ? ` x${line.qty}` : ""}</span>
                      <span className="font-mono">{formatCents(line.totalCents)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span className="font-mono">{formatCents(latestQuote.totalCents)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment */}
          {payments.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="flex justify-between items-center text-sm py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.method === "CARD" ? "Card" : "Cash"}</span>
                      <Badge variant={
                        p.status === "SUCCEEDED" ? "success" :
                        p.status === "PENDING" ? "warning" :
                        p.status === "FAILED" ? "destructive" :
                        "secondary"
                      }>
                        {p.status}
                      </Badge>
                      {p.paidAt && <span className="text-xs text-muted-foreground">{formatDate(p.paidAt)}</span>}
                    </div>
                    <span className="font-mono font-medium">{formatCents(p.amountCents)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <Card>
            <CardContent className="pt-6 space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-0.5">Scheduled</p>
                <p>{job.scheduledDate ? formatDate(job.scheduledDate) : "Not scheduled"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-0.5">Assigned To</p>
                <p>{job.assignedTo?.name ?? "Unassigned"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-0.5">Source</p>
                <p>{job.source}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-0.5">Created By</p>
                <p>{job.createdBy.name}</p>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          {(job.enRouteAt || job.onSiteAt || job.completedAt || job.canceledAt) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1.5">
                {job.enRouteAt && <p>En Route: {formatDate(job.enRouteAt)}</p>}
                {job.onSiteAt && <p>On Site: {formatDate(job.onSiteAt)}</p>}
                {job.completedAt && <p>Completed: {formatDate(job.completedAt)}</p>}
                {job.canceledAt && (
                  <p>Canceled: {formatDate(job.canceledAt)}{job.cancelReason ? ` - ${job.cancelReason}` : ""}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {job.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{job.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Rebook button for completed/paid/canceled jobs (#5) */}
      {["COMPLETED", "PAID", "CANCELED"].includes(job.status) && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <Button asChild variant="outline" className="w-full">
              <Link
                href={`/app/jobs/new?customerId=${job.customerId}&addressId=${job.addressId ?? ""}&assignedToId=${job.assignedToId ?? ""}&source=REPEAT`}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Rebook This Customer
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit form for Dispatcher/Admin */}
      {(user.role === "DISPATCHER" || user.role === "ORG_ADMIN") && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Edit Job</CardTitle>
          </CardHeader>
          <CardContent>
            <JobEditForm
              jobId={job.id}
              currentAssignedToId={job.assignedToId}
              currentScheduledDate={job.scheduledDate}
              currentNotes={job.notes}
              leadmen={leadmen}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
