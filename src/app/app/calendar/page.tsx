import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tenantScope } from "@/lib/tenant";
import { getOrgToday, dateToDayBounds } from "@/lib/date-utils";
import Link from "next/link";
import type { JobStatus } from "@prisma/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type CalendarJob = {
  id: string;
  jobNumber: number;
  status: JobStatus;
  scheduledDate: string;
  customer: { name: string };
  assignedTo: { name: string } | null;
};

const STATUS_VARIANT: Partial<Record<JobStatus, "info" | "warning" | "success" | "default">> = {
  SCHEDULED: "info",
  EN_ROUTE: "warning",
  ON_SITE: "warning",
  IN_PROGRESS: "info",
  COMPLETED: "success",
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const result = await resolveAuth();
  if (!result.ok) redirect("/login");
  if (!("user" in result)) redirect("/platform");
  const { user } = result;
  if (user.role === "LEADMAN") redirect("/m");

  const { week: weekParam } = await searchParams;

  const { todayStr } = getOrgToday(user.timezone);

  // Determine the Monday of the target week
  let weekStartStr: string;
  if (weekParam) {
    weekStartStr = weekParam;
  } else {
    // Find Monday of the current week in org timezone
    const todayDate = new Date(todayStr + "T12:00:00Z");
    const day = todayDate.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    todayDate.setUTCDate(todayDate.getUTCDate() + diff);
    weekStartStr = todayDate.toISOString().slice(0, 10);
  }

  // Build week boundaries in UTC using org timezone
  const { start: weekStart } = dateToDayBounds(weekStartStr, user.timezone);
  const weekEndDate = new Date(weekStartStr + "T12:00:00Z");
  weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 7);
  const weekEndStr = weekEndDate.toISOString().slice(0, 10);
  const { start: weekEnd } = dateToDayBounds(weekEndStr, user.timezone);

  // Prev/next week strings for navigation
  const prevDate = new Date(weekStartStr + "T12:00:00Z");
  prevDate.setUTCDate(prevDate.getUTCDate() - 7);
  const prevWeekStr = prevDate.toISOString().slice(0, 10);
  const nextDate = new Date(weekStartStr + "T12:00:00Z");
  nextDate.setUTCDate(nextDate.getUTCDate() + 7);
  const nextWeekStr = nextDate.toISOString().slice(0, 10);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });
  const jobs = (await t.findMany("job", {
    where: {
      scheduledDate: { gte: weekStart, lt: weekEnd },
      status: { notIn: ["PAID", "CANCELED"] },
    },
    include: {
      customer: { select: { name: true } },
      assignedTo: { select: { name: true } },
    },
    orderBy: { scheduledDate: "asc" },
  })) as CalendarJob[];

  // Build day strings for the week (YYYY-MM-DD)
  const dayStrings = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStartStr + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });

  function jobsForDay(dateStr: string) {
    const { start: dayStart, end: dayEnd } = dateToDayBounds(dateStr, user.timezone);
    return jobs.filter((j) => {
      if (!j.scheduledDate) return false;
      const sd = new Date(j.scheduledDate);
      return sd >= dayStart && sd <= dayEnd;
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/app/calendar?week=${prevWeekStr}`}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="text-sm font-medium min-w-[180px] text-center">
            {new Date(weekStartStr + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: user.timezone })} -{" "}
            {new Date(weekEnd.getTime() - 1).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              timeZone: user.timezone,
            })}
          </span>
          <Button variant="outline" size="icon" asChild>
            <Link href={`/app/calendar?week=${nextWeekStr}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 divide-x divide-border">
          {dayStrings.map((dayStr) => {
            const isToday = dayStr === todayStr;
            const dayJobs = jobsForDay(dayStr);
            const dayDate = new Date(dayStr + "T12:00:00Z");

            return (
              <div
                key={dayStr}
                className={cn(
                  "min-h-[160px] p-2",
                  isToday && "bg-accent/50"
                )}
              >
                <div className={cn(
                  "text-xs font-medium mb-2",
                  isToday ? "text-foreground" : "text-muted-foreground"
                )}>
                  {dayDate.toLocaleDateString("en-US", { weekday: "short", day: "numeric", timeZone: user.timezone })}
                </div>
                <div className="space-y-1">
                  {dayJobs.map((j) => (
                    <Link
                      key={j.id}
                      href={`/app/jobs/${j.id}`}
                      className="block"
                    >
                      <Badge
                        variant={STATUS_VARIANT[j.status] || "secondary"}
                        className="w-full justify-start truncate text-xs font-normal cursor-pointer"
                      >
                        #{j.jobNumber} {j.customer.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
