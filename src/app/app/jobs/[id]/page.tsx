import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tenantScope } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { canTransition } from "@/lib/status";
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
