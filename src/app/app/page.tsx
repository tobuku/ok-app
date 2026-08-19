import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tenantScope } from "@/lib/tenant";
import Link from "next/link";
import type { JobStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type JobRow = {
  id: string;
  jobNumber: number;
  status: JobStatus;
  scheduledDate: string | null;
  notes: string | null;
  customer: { id: string; name: string; phone: string | null };
  assignedTo: { id: string; name: string } | null;
};

const BOARD_COLUMNS: { status: JobStatus; label: string; color: string }[] = [
  { status: "NEW", label: "New", color: "bg-gray-100" },
  { status: "SCHEDULED", label: "Scheduled", color: "bg-blue-50" },
  { status: "EN_ROUTE", label: "En Route", color: "bg-yellow-50" },
  { status: "ON_SITE", label: "On Site", color: "bg-orange-50" },
  { status: "IN_PROGRESS", label: "In Progress", color: "bg-purple-50" },
  { status: "COMPLETED", label: "Completed", color: "bg-green-50" },
];

export default async function JobBoardPage() {
  const result = await resolveAuth();
  if (!result.ok) redirect("/login");
  if (!("user" in result)) redirect("/platform");
  const { user } = result;

  // Leadman should use mobile view
  if (user.role === "LEADMAN") redirect("/m");

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });
  const jobs = (await t.findMany("job", {
    where: { status: { notIn: ["PAID", "CANCELED"] } },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: { scheduledDate: "asc" },
  })) as JobRow[];

  const jobsByStatus = BOARD_COLUMNS.map((col) => ({
    ...col,
    jobs: jobs.filter((j) => j.status === col.status),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Job Board</h1>
        <Link
          href="/app/jobs/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          New Job
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {jobsByStatus.map((col) => (
          <div key={col.status} className={`rounded-lg p-3 ${col.color} min-h-[200px]`}>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              {col.label}{" "}
              <span className="text-gray-400">({col.jobs.length})</span>
            </h2>
            <div className="space-y-2">
              {col.jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/app/jobs/${job.id}`}
                  className="block bg-white rounded-md p-3 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                >
                  <div className="text-xs font-mono text-gray-400 mb-1">
                    #{job.jobNumber}
                  </div>
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {job.customer.name}
                  </div>
                  {job.assignedTo && (
                    <div className="text-xs text-gray-500 mt-1">
                      {job.assignedTo.name}
                    </div>
                  )}
                  {job.scheduledDate && (
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(job.scheduledDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
