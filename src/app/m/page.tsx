import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tenantScope } from "@/lib/tenant";
import { getOrgToday } from "@/lib/date-utils";
import Link from "next/link";
import type { JobStatus } from "@prisma/client";
import { ChevronRight, MapPin, Plus, ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, getStatusBorderColor } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type JobCard = {
  id: string;
  jobNumber: number;
  status: JobStatus;
  scheduledDate: string | null;
  notes: string | null;
  createdAt: string;
  customer: { name: string; phone: string | null };
  address: { line1: string; city: string; state: string; zip: string } | null;
};

export default async function TodayPage() {
  const result = await resolveAuth();
  if (!result.ok) redirect("/login");
  if (!("user" in result)) redirect("/platform");
  const { user } = result;

  const { todayStr, start, end } = getOrgToday(user.timezone);

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  // Today's scheduled jobs
  const todayWhere: Record<string, unknown> = {
    scheduledDate: { gte: start, lte: end },
    status: { notIn: ["PAID", "CANCELED"] },
  };
  if (user.role === "LEADMAN") todayWhere.assignedToId = user.id;

  const jobs = (await t.findMany("job", {
    where: todayWhere,
    include: {
      customer: { select: { name: true, phone: true } },
      address: { select: { line1: true, city: true, state: true, zip: true } },
    },
    orderBy: { scheduledDate: "asc" },
  })) as JobCard[];

  // My open estimates (ESTIMATE or QUOTED status, no scheduledDate filter)
  const estWhere: Record<string, unknown> = {
    status: { in: ["ESTIMATE", "QUOTED"] },
    source: "FIELD_ESTIMATE",
  };
  if (user.role === "LEADMAN") estWhere.assignedToId = user.id;

  const estimates = (await t.findMany("job", {
    where: estWhere,
    include: {
      customer: { select: { name: true, phone: true } },
      address: { select: { line1: true, city: true, state: true, zip: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  })) as JobCard[];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold mb-1">Today&apos;s Jobs</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(todayStr + "T12:00:00Z").toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              timeZone: user.timezone,
            })}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/m/estimate">
            <Plus className="h-4 w-4 mr-1" />
            New Estimate
          </Link>
        </Button>
      </div>
      {jobs.length === 0 ? (
        <EmptyState
          title="No jobs scheduled for today"
          className="mt-12"
        />
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobCardLink key={job.id} job={job} />
          ))}
        </div>
      )}

      {/* My Estimates section */}
      {estimates.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-bold">My Estimates</h2>
            <span className="text-xs text-muted-foreground">({estimates.length})</span>
          </div>
          <div className="space-y-3">
            {estimates.map((job) => (
              <JobCardLink key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function JobCardLink({ job }: { job: JobCard }) {
  return (
    <Link href={`/m/jobs/${job.id}`}>
      <Card className={cn(
        "p-4 active:bg-accent transition-colors border-l-4",
        getStatusBorderColor(job.status)
      )}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground">#{job.jobNumber}</span>
              <StatusBadge status={job.status} />
            </div>
            <p className="font-medium truncate">{job.customer.name}</p>
            {job.customer.phone && (
              <p className="text-sm text-muted-foreground">{job.customer.phone}</p>
            )}
            {job.address && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                {job.address.line1}, {job.address.city}
              </p>
            )}
            {job.notes && (
              <p className="text-xs text-muted-foreground/70 mt-1 truncate">{job.notes}</p>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground/40 shrink-0 mt-1" />
        </div>
      </Card>
    </Link>
  );
}
