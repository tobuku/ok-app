import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tenantScope } from "@/lib/tenant";
import Link from "next/link";
import type { JobStatus } from "@prisma/client";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobCard } from "@/components/job-card";

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

const BOARD_COLUMNS: { status: JobStatus; label: string }[] = [
  { status: "NEW", label: "New" },
  { status: "SCHEDULED", label: "Scheduled" },
  { status: "EN_ROUTE", label: "En Route" },
  { status: "ON_SITE", label: "On Site" },
  { status: "IN_PROGRESS", label: "In Progress" },
  { status: "COMPLETED", label: "Completed" },
];

export default async function JobBoardPage() {
  const result = await resolveAuth();
  if (!result.ok) redirect("/login");
  if (!("user" in result)) redirect("/platform");
  const { user } = result;

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
        <Button asChild>
          <Link href="/app/jobs/new">
            <Plus className="h-4 w-4 mr-1" />
            New Job
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {jobsByStatus.map((col) => (
          <div key={col.status} className="rounded-lg border border-border bg-muted/40 p-3 min-h-[200px]">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              {col.label}{" "}
              <span className="text-muted-foreground/60">({col.jobs.length})</span>
            </h2>
            <div className="space-y-2">
              {col.jobs.map((job) => (
                <JobCard
                  key={job.id}
                  id={job.id}
                  jobNumber={job.jobNumber}
                  status={job.status}
                  customerName={job.customer.name}
                  assigneeName={job.assignedTo?.name}
                  scheduledDate={job.scheduledDate}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
