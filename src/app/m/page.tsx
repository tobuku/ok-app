import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tenantScope } from "@/lib/tenant";
import Link from "next/link";
import type { JobStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type TodayJob = {
  id: string;
  jobNumber: number;
  status: JobStatus;
  scheduledDate: string | null;
  notes: string | null;
  customer: { name: string; phone: string | null };
  address: { line1: string; city: string; state: string; zip: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Scheduled",
  EN_ROUTE: "En Route",
  ON_SITE: "On Site",
  QUOTED: "Quoted",
  ACCEPTED: "Accepted",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  EN_ROUTE: "bg-yellow-100 text-yellow-800",
  ON_SITE: "bg-orange-100 text-orange-800",
  IN_PROGRESS: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800",
};

export default async function TodayPage() {
  const result = await resolveAuth();
  if (!result.ok) redirect("/login");
  if (!("user" in result)) redirect("/platform");
  const { user } = result;

  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;
  // Use UTC bounds so dates stored as UTC midnight match correctly
  const start = new Date(todayStr + "T00:00:00Z");
  const end = new Date(todayStr + "T23:59:59.999Z");

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  // Leadman sees only their assigned jobs; others see all
  const where: Record<string, unknown> = {
    scheduledDate: { gte: start, lte: end },
    status: { notIn: ["PAID", "CANCELED"] },
  };
  if (user.role === "LEADMAN") where.assignedToId = user.id;

  const jobs = (await t.findMany("job", {
    where,
    include: {
      customer: { select: { name: true, phone: true } },
      address: { select: { line1: true, city: true, state: true, zip: true } },
    },
    orderBy: { scheduledDate: "asc" },
  })) as TodayJob[];

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">
        Today&apos;s Jobs
      </h1>
      <p className="text-sm text-gray-500 mb-4">
        {today.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </p>

      {jobs.length === 0 ? (
        <p className="text-gray-400 text-center mt-12">No jobs scheduled for today.</p>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/m/jobs/${job.id}`}
              className="block bg-white rounded-lg shadow-sm border border-gray-200 p-4 active:bg-gray-50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-gray-400">#{job.jobNumber}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        STATUS_COLORS[job.status] || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {STATUS_LABELS[job.status] || job.status}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900 truncate">{job.customer.name}</p>
                  {job.customer.phone && (
                    <p className="text-sm text-gray-500">{job.customer.phone}</p>
                  )}
                  {job.address && (
                    <p className="text-sm text-gray-500 mt-1">
                      {job.address.line1}, {job.address.city}
                    </p>
                  )}
                  {job.notes && (
                    <p className="text-xs text-gray-400 mt-1 truncate">{job.notes}</p>
                  )}
                </div>
                <svg
                  className="w-5 h-5 text-gray-300 flex-shrink-0 mt-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
