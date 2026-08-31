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
  searchParams: Promise<{ week?: string; month?: string; view?: string }>;
}) {
  const result = await resolveAuth();
  if (!result.ok) redirect("/login");
  if (!("user" in result)) redirect("/platform");
  const { user } = result;
  if (user.role === "LEADMAN") redirect("/m");

  const { week: weekParam, month: monthParam, view: viewParam } = await searchParams;
  const view = viewParam === "month" ? "month" : "week";

  const { todayStr } = getOrgToday(user.timezone);
  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  if (view === "month") {
    // Monthly view
    let yearNum: number;
    let monthNum: number; // 0-indexed
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [y, m] = monthParam.split("-").map(Number);
      yearNum = y;
      monthNum = m - 1;
    } else {
      const [y, m] = todayStr.split("-").map(Number);
      yearNum = y;
      monthNum = m - 1;
    }

    // First and last day of the month
    const firstDayStr = `${yearNum}-${String(monthNum + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(Date.UTC(yearNum, monthNum + 1, 0)).getUTCDate();
    const lastDayStr = `${yearNum}-${String(monthNum + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const { start: monthStart } = dateToDayBounds(firstDayStr, user.timezone);
    const { end: monthEnd } = dateToDayBounds(lastDayStr, user.timezone);

    const jobs = (await t.findMany("job", {
      where: {
        scheduledDate: { gte: monthStart, lte: monthEnd },
        status: { notIn: ["PAID", "CANCELED"] },
      },
      include: {
        customer: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
      orderBy: { scheduledDate: "asc" },
    })) as CalendarJob[];

    // Build all day strings for the month
    const dayStrings = Array.from({ length: lastDay }, (_, i) => {
      const d = i + 1;
      return `${yearNum}-${String(monthNum + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    });

    // What day of week does the 1st fall on? (0=Sun..6=Sat) — shift to Mon=0
    const firstDow = new Date(Date.UTC(yearNum, monthNum, 1)).getUTCDay();
    const startOffset = firstDow === 0 ? 6 : firstDow - 1; // blanks before day 1

    function jobsForDay(dateStr: string) {
      const { start: dayStart, end: dayEnd } = dateToDayBounds(dateStr, user.timezone);
      return jobs.filter((j) => {
        if (!j.scheduledDate) return false;
        const sd = new Date(j.scheduledDate);
        return sd >= dayStart && sd <= dayEnd;
      });
    }

    // Prev/next month
    const prevMonth = new Date(Date.UTC(yearNum, monthNum - 1, 1));
    const nextMonth = new Date(Date.UTC(yearNum, monthNum + 1, 1));
    const fmtMonth = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const monthLabel = new Date(Date.UTC(yearNum, monthNum, 15)).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Calendar</h1>
          <div className="flex items-center gap-2">
            <ViewToggle current={view} />
            <Button variant="outline" size="icon" asChild>
              <Link href={`/app/calendar?view=month&month=${fmtMonth(prevMonth)}`}>
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <span className="text-sm font-medium min-w-[180px] text-center">
              {monthLabel}
            </span>
            <Button variant="outline" size="icon" asChild>
              <Link href={`/app/calendar?view=month&month=${fmtMonth(nextMonth)}`}>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 divide-x divide-border bg-muted border-b border-border">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="text-xs font-medium text-muted-foreground text-center py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-border">
            {/* Empty cells before the 1st */}
            {Array.from({ length: startOffset }, (_, i) => (
              <div key={`blank-${i}`} className="min-h-[100px] p-1 bg-muted/30" />
            ))}
            {dayStrings.map((dayStr) => {
              const isToday = dayStr === todayStr;
              const dayJobs = jobsForDay(dayStr);
              const dayNum = parseInt(dayStr.split("-")[2], 10);

              return (
                <div
                  key={dayStr}
                  className={cn(
                    "min-h-[100px] p-1 border-b border-border",
                    isToday && "bg-accent/50"
                  )}
                >
                  <div className={cn(
                    "text-xs font-medium mb-1 text-center",
                    isToday ? "text-primary font-bold" : "text-muted-foreground"
                  )}>
                    {dayNum}
                  </div>
                  <div className="space-y-0.5">
                    {dayJobs.slice(0, 3).map((j) => (
                      <Link key={j.id} href={`/app/jobs/${j.id}`} className="block">
                        <Badge
                          variant={STATUS_VARIANT[j.status] || "secondary"}
                          className="w-full justify-start truncate text-[10px] font-normal cursor-pointer px-1 py-0"
                        >
                          #{j.jobNumber} {j.customer.name}
                        </Badge>
                      </Link>
                    ))}
                    {dayJobs.length > 3 && (
                      <span className="text-[10px] text-muted-foreground pl-1">+{dayJobs.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }

  // Weekly view (default)
  let weekStartStr: string;
  if (weekParam) {
    weekStartStr = weekParam;
  } else {
    const todayDate = new Date(todayStr + "T12:00:00Z");
    const day = todayDate.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    todayDate.setUTCDate(todayDate.getUTCDate() + diff);
    weekStartStr = todayDate.toISOString().slice(0, 10);
  }

  const { start: weekStart } = dateToDayBounds(weekStartStr, user.timezone);
  const weekEndDate = new Date(weekStartStr + "T12:00:00Z");
  weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 7);
  const weekEndStr = weekEndDate.toISOString().slice(0, 10);
  const { start: weekEnd } = dateToDayBounds(weekEndStr, user.timezone);

  const prevDate = new Date(weekStartStr + "T12:00:00Z");
  prevDate.setUTCDate(prevDate.getUTCDate() - 7);
  const prevWeekStr = prevDate.toISOString().slice(0, 10);
  const nextDate = new Date(weekStartStr + "T12:00:00Z");
  nextDate.setUTCDate(nextDate.getUTCDate() + 7);
  const nextWeekStr = nextDate.toISOString().slice(0, 10);

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
          <ViewToggle current={view} />
          <Button variant="outline" size="icon" asChild>
            <Link href={`/app/calendar?view=week&week=${prevWeekStr}`}>
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
            <Link href={`/app/calendar?view=week&week=${nextWeekStr}`}>
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

function ViewToggle({ current }: { current: "week" | "month" }) {
  return (
    <div className="flex rounded-md border border-input overflow-hidden mr-2">
      <Link
        href="/app/calendar?view=week"
        className={cn(
          "px-3 py-1.5 text-xs font-medium transition-colors",
          current === "week"
            ? "bg-primary text-primary-foreground"
            : "bg-background text-muted-foreground hover:bg-accent"
        )}
      >
        Week
      </Link>
      <Link
        href="/app/calendar?view=month"
        className={cn(
          "px-3 py-1.5 text-xs font-medium transition-colors border-l border-input",
          current === "month"
            ? "bg-primary text-primary-foreground"
            : "bg-background text-muted-foreground hover:bg-accent"
        )}
      >
        Month
      </Link>
    </div>
  );
}
