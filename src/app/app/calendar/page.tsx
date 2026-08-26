import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tenantScope } from "@/lib/tenant";
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

  const today = new Date();
  let weekStart: Date;
  if (weekParam) {
    weekStart = new Date(weekParam + "T00:00:00");
  } else {
    weekStart = new Date(today);
    const day = weekStart.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    weekStart.setDate(weekStart.getDate() + diff);
  }
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const prevWeek = new Date(weekStart);
  prevWeek.setDate(prevWeek.getDate() - 7);
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);

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

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  function jobsForDay(date: Date) {
    const dateStr = fmt(date);
    return jobs.filter((j) => j.scheduledDate && j.scheduledDate.slice(0, 10) === dateStr);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/app/calendar?week=${fmt(prevWeek)}`}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="text-sm font-medium min-w-[180px] text-center">
            {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
            {new Date(weekEnd.getTime() - 1).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <Button variant="outline" size="icon" asChild>
            <Link href={`/app/calendar?week=${fmt(nextWeek)}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 divide-x divide-border">
          {days.map((day) => {
            const isToday = fmt(day) === fmt(today);
            const dayJobs = jobsForDay(day);

            return (
              <div
                key={fmt(day)}
                className={cn(
                  "min-h-[160px] p-2",
                  isToday && "bg-accent/50"
                )}
              >
                <div className={cn(
                  "text-xs font-medium mb-2",
                  isToday ? "text-foreground" : "text-muted-foreground"
                )}>
                  {day.toLocaleDateString("en-US", { weekday: "short", day: "numeric" })}
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
