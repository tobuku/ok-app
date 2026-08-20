import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tenantScope } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { canTransition } from "@/lib/status";
import Link from "next/link";
import type { JobStatus } from "@prisma/client";
import { MobileStatusButton } from "./mobile-status-button";
import { PhotoCapture } from "./photo-capture";
import { PhotoGallery } from "./photo-gallery";
import { QuoteBuilder } from "./quote-builder";

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

// For the leadman flow, these are the main forward transitions
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

  // Get org tax rate for quote builder
  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: { taxRateBps: true },
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

  // Primary action = next forward step in the leadman flow
  const nextForward = LEADMAN_FLOW.find((s) => canTransition(job.status, s));
  const canCancel = canTransition(job.status, "CANCELED");

  // Build address for Maps link
  const addressStr = job.address
    ? `${job.address.line1}, ${job.address.city}, ${job.address.state} ${job.address.zip}`
    : null;
  const mapsUrl = addressStr
    ? `https://maps.google.com/?q=${encodeURIComponent(addressStr)}`
    : null;

  return (
    <div>
      <Link href="/m" className="text-sm text-blue-600 mb-4 block">
        Back
      </Link>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-mono text-gray-400">#{job.jobNumber}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 font-medium">
            {STATUS_LABELS[job.status]}
          </span>
        </div>

        {/* Customer */}
        <h1 className="text-xl font-bold mt-2">{job.customer.name}</h1>
        {job.customer.phone && (
          <a href={`tel:${job.customer.phone}`} className="text-blue-600 text-sm block mt-1">
            {job.customer.phone}
          </a>
        )}

        {/* Address with Maps link */}
        {job.address && (
          <div className="mt-3">
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 text-sm underline"
              >
                {job.address.line1}
                {job.address.line2 ? `, ${job.address.line2}` : ""},{" "}
                {job.address.city}, {job.address.state} {job.address.zip}
              </a>
            ) : (
              <p className="text-sm text-gray-600">
                {job.address.line1}, {job.address.city}, {job.address.state} {job.address.zip}
              </p>
            )}
          </div>
        )}

        {/* Notes */}
        {job.notes && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.notes}</p>
          </div>
        )}

        {/* Timestamps */}
        <div className="mt-4 text-xs text-gray-400 space-y-1">
          {job.enRouteAt && <p>En route: {new Date(job.enRouteAt).toLocaleTimeString()}</p>}
          {job.onSiteAt && <p>On site: {new Date(job.onSiteAt).toLocaleTimeString()}</p>}
          {job.completedAt && <p>Completed: {new Date(job.completedAt).toLocaleTimeString()}</p>}
        </div>

        {/* Photos */}
        <div className="mt-4">
          <PhotoGallery jobId={job.id} />
        </div>

        {/* Photo capture — show when ON_SITE or later (before PAID) */}
        {["ON_SITE", "QUOTED", "ACCEPTED", "DECLINED", "IN_PROGRESS", "COMPLETED"].includes(job.status) && (
          <div className="mt-4 space-y-2">
            {["ON_SITE", "QUOTED", "ACCEPTED", "DECLINED"].includes(job.status) && (
              <PhotoCapture jobId={job.id} type="before" />
            )}
            {["IN_PROGRESS", "COMPLETED"].includes(job.status) && (
              <PhotoCapture jobId={job.id} type="after" />
            )}
          </div>
        )}

        {/* Quote builder — show when ON_SITE, QUOTED, or DECLINED */}
        <div className="mt-4">
          <QuoteBuilder
            jobId={job.id}
            jobStatus={job.status}
            taxRateBps={org?.taxRateBps ?? 0}
          />
        </div>

        {/* Action buttons */}
        <div className="mt-6 space-y-3">
          {nextForward && (
            <MobileStatusButton
              jobId={job.id}
              newStatus={nextForward}
              label={STATUS_LABELS[nextForward]}
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
      </div>
    </div>
  );
}
