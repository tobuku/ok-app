import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tenantScope } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { formatDate, formatCents } from "@/lib/format";
import { canTransition } from "@/lib/status";
import { getSignedUrls } from "@/lib/storage";
import Link from "next/link";
import type { JobStatus } from "@prisma/client";
import { JobStatusButton } from "./status-button";
import { JobEditForm } from "./edit-form";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<JobStatus, string> = {
  NEW: "New",
  SCHEDULED: "Scheduled",
  EN_ROUTE: "En Route",
  ON_SITE: "On Site",
  QUOTED: "Quoted",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  PAID: "Paid",
  CANCELED: "Canceled",
};

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

  // Get available transitions
  const transitions = ALL_STATUSES.filter((s) => canTransition(job.status, s));

  // Get org users for reassignment dropdown
  const orgUsers = await prisma.user.findMany({
    where: { orgId: user.orgId, active: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  const leadmen = orgUsers.filter((u) => u.role === "LEADMAN");

  // Fetch photos for this job
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

  // Fetch latest quote
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

  // Fetch payments for this job
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
    <div className="max-w-3xl">
      <Link href="/app" className="text-sm text-blue-600 hover:underline mb-4 block">
        Back to board
      </Link>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              Job #{job.jobNumber}
            </h1>
            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
              {STATUS_LABELS[job.status]}
            </span>
          </div>
        </div>

        {/* Status transitions */}
        {transitions.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {transitions.map((s) => (
              <JobStatusButton
                key={s}
                jobId={job.id}
                newStatus={s}
                label={STATUS_LABELS[s]}
              />
            ))}
          </div>
        )}

        {/* Customer info */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Customer</h2>
          <p className="font-medium">{job.customer.name}</p>
          {job.customer.phone && <p className="text-sm text-gray-600">{job.customer.phone}</p>}
          {job.customer.email && <p className="text-sm text-gray-600">{job.customer.email}</p>}
          {job.address && (
            <p className="text-sm text-gray-600 mt-1">
              {job.address.line1}
              {job.address.line2 ? `, ${job.address.line2}` : ""},{" "}
              {job.address.city}, {job.address.state} {job.address.zip}
            </p>
          )}
        </section>

        {/* Schedule & assignment */}
        <section className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-1">Scheduled</h2>
            <p className="text-sm">{job.scheduledDate ? formatDate(job.scheduledDate) : "Not scheduled"}</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-1">Assigned To</h2>
            <p className="text-sm">{job.assignedTo?.name ?? "Unassigned"}</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-1">Source</h2>
            <p className="text-sm">{job.source}</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-1">Created By</h2>
            <p className="text-sm">{job.createdBy.name}</p>
          </div>
        </section>

        {/* Timestamps */}
        {(job.enRouteAt || job.onSiteAt || job.completedAt || job.canceledAt) && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Timeline</h2>
            <div className="text-sm space-y-1">
              {job.enRouteAt && <p>En Route: {formatDate(job.enRouteAt)}</p>}
              {job.onSiteAt && <p>On Site: {formatDate(job.onSiteAt)}</p>}
              {job.completedAt && <p>Completed: {formatDate(job.completedAt)}</p>}
              {job.canceledAt && (
                <p>Canceled: {formatDate(job.canceledAt)}{job.cancelReason ? ` — ${job.cancelReason}` : ""}</p>
              )}
            </div>
          </section>
        )}

        {/* Notes */}
        {job.notes && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Notes</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.notes}</p>
          </section>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Photos</h2>
            {beforePhotos.length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-gray-400 mb-1">Before ({beforePhotos.length})</p>
                <div className="flex gap-2 flex-wrap">
                  {beforePhotos.map((p) => (
                    <a key={p.id} href={photoUrls[p.storageKey] ?? "#"} target="_blank" rel="noopener noreferrer">
                      <img src={photoUrls[p.storageKey] ?? ""} alt="Before" className="w-24 h-24 object-cover rounded border border-gray-200" />
                    </a>
                  ))}
                </div>
              </div>
            )}
            {afterPhotos.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-1">After ({afterPhotos.length})</p>
                <div className="flex gap-2 flex-wrap">
                  {afterPhotos.map((p) => (
                    <a key={p.id} href={photoUrls[p.storageKey] ?? "#"} target="_blank" rel="noopener noreferrer">
                      <img src={photoUrls[p.storageKey] ?? ""} alt="After" className="w-24 h-24 object-cover rounded border border-gray-200" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Quote */}
        {latestQuote && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">
              Quote — {latestQuote.status}
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              {quoteLines.map((line) => (
                <div key={line.id} className="flex justify-between">
                  <span>{line.label}{line.qty > 1 ? ` x${line.qty}` : ""}</span>
                  <span>{formatCents(line.totalCents)}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-1 mt-2 font-medium flex justify-between">
                <span>Total</span>
                <span>{formatCents(latestQuote.totalCents)}</span>
              </div>
            </div>
          </section>
        )}

        {/* Payment */}
        {payments.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Payment</h2>
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="bg-gray-50 rounded-lg p-3 text-sm flex justify-between items-center">
                  <div>
                    <span className="font-medium">{p.method === "CARD" ? "Card" : "Cash"}</span>
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                      p.status === "SUCCEEDED" ? "bg-green-100 text-green-700" :
                      p.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                      p.status === "FAILED" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>{p.status}</span>
                    {p.paidAt && <span className="text-xs text-gray-400 ml-2">{formatDate(p.paidAt)}</span>}
                  </div>
                  <span className="font-medium">{formatCents(p.amountCents)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Edit form for Dispatcher/Admin */}
        {(user.role === "DISPATCHER" || user.role === "ORG_ADMIN") && (
          <section className="border-t pt-6 mt-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Edit Job</h2>
            <JobEditForm
              jobId={job.id}
              currentAssignedToId={job.assignedToId}
              currentScheduledDate={job.scheduledDate}
              currentNotes={job.notes}
              leadmen={leadmen}
            />
          </section>
        )}
      </div>
    </div>
  );
}
