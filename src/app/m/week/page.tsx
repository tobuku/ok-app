import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tenantScope } from "@/lib/tenant";
import { getOrgToday, dateToDayBounds } from "@/lib/date-utils";
import Link from "next/link";
import type { JobStatus } from "@prisma/client";
import { ChevronRight, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge, getStatusBorderColor } from "@/components/status-badge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type WeekJob = {
  id: string;
  jobNumber: number;
  status: JobStatus;
  scheduledDate: string | null;
  notes: string | null;
  customer: { name: string; phone: string | null };
  address: { line1: string; city: string; state: string; zip: string } | null;
};

export default async function WeekPage() {
  const result = await resolveAuth();
  if (!result.ok) redirect("/login");
  if (!("user" in result)) redirect("/platform");
  const { user } = result;

  const { todayStr } = getOrgToday(user.timezone);

  // Calculate Monday of current week
  const today = new Date(todayStr + "T12:00:00Z");
  const dayOfWeek = today.getUTCDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() + mondayOffset);

  // Build array of 7 days (Mon-Sun)
  const days: { dateStr: string; label: string; isToday: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${dd}`;
    days.push({
      dateStr,
      label: d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      isToday: dateStr === todayStr,
    });
  }

  // Query all jobs for the week
  const weekStart = dateToDayBounds(days[0].dateStr, user.timezone).start;
  const weekEnd = dateToDayBounds(days[6].dateStr, user.timezone).end;

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  const where: Record<string, unknown> = {
    scheduledDate: { gte: weekStart, lte: weekEnd },
  };
  if (user.role === "LEADMAN") where.assignedToId = user.id;

  const jobs = (await t.findMany("job", {
    where,
    include: {
      customer: { select: { name: true, phone: true } },
      address: { select: { line1: true, city: true, state: true, zip: true } },
    },
    orderBy: { scheduledDate: "asc" },
  })) as WeekJob[];

  // Group jobs by day
  const jobsByDay = new Map<string, WeekJob[]>();
  for (const day of days) {
    jobsByDay.set(day.dateStr, []);
  }
  for (const job of jobs) {
    if (!job.scheduledDate) continue;
    // Convert job scheduledDate to org-local date string
    const jobDate = new Date(job.scheduledDate);
    const localStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: user.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(jobDate);
    const bucket = jobsByDay.get(localStr);
    if (bucket) bucket.push(job);
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">This Week</h1>
      <p className="text-sm text-muted-foreground mb-4">
        {days[0].label} &ndash; {days[6].label}
      </p>

      <div className="space-y-5">
        {days.map((day) => {
          const dayJobs = jobsByDay.get(day.dateStr) || [];
          return (
            <div key={day.dateStr}>
              <h2 className={cn(
                "text-sm font-semibold mb-2",
                day.isToday && "text-primary"
              )}>
                {day.label}
                {day.isToday && <span className="ml-2 text-xs font-normal text-primary">(Today)</span>}
              </h2>

              {dayJobs.length === 0 ? (
                <p className="text-xs text-muted-foreground/60 ml-1">No jobs scheduled</p>
              ) : (
                <div className="space-y-2">
                  {dayJobs.map((job) => (
                    <Link key={job.id} href={`/m/jobs/${job.id}`}>
                      <Card className={cn(
                        "p-3 active:bg-accent transition-colors border-l-4",
                        getStatusBorderColor(job.status)
                      )}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-muted-foreground">#{job.jobNumber}</span>
                              <StatusBadge status={job.status} />
                            </div>
                            <p className="font-medium truncate text-sm">{job.customer.name}</p>
                            {job.customer.phone && (
                              <p className="text-xs text-muted-foreground">{job.customer.phone}</p>
                            )}
                            {job.address && (
                              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {job.address.line1}, {job.address.city}
                              </p>
                            )}
                            {job.notes && (
                              <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{job.notes}</p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-1" />
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
