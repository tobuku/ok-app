import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tenantScope } from "@/lib/tenant";
import Link from "next/link";
import type { JobStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type CalendarJob = {
  id: string;
  jobNumber: number;
  status: JobStatus;
  scheduledDate: string;
  customer: { name: string };
  assignedTo: { name: string } | null;
};

const STATUS_COLORS: Partial<Record<JobStatus, string>> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  EN_ROUTE: "bg-yellow-100 text-yellow-800",
  ON_SITE: "bg-orange-100 text-orange-800",
  IN_PROGRESS: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800",
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

  // Calculate week start (Monday)
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

  // Build 7 days
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
        <div className="flex items-center gap-3">
          <Link
            href={`/app/calendar?week=${fmt(prevWeek)}`}
            className="text-sm text-gray-600 hover:text-gray-900 px-2 py-1 border rounded"
          >
            Prev
          </Link>
          <span className="text-sm font-medium">
            {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
            {new Date(weekEnd.getTime() - 1).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <Link
            href={`/app/calendar?week=${fmt(nextWeek)}`}
            className="text-sm text-gray-600 hover:text-gray-900 px-2 py-1 border rounded"
          >
            Next
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {days.map((day) => {
          const isToday = fmt(day) === fmt(today);
          const dayJobs = jobsForDay(day);

          return (
            <div
              key={fmt(day)}
              className={`bg-white min-h-[160px] p-2 ${isToday ? "ring-2 ring-blue-500 ring-inset" : ""}`}
            >
              <div className={`text-xs font-medium mb-2 ${isToday ? "text-blue-600" : "text-gray-500"}`}>
                {day.toLocaleDateString("en-US", { weekday: "short", day: "numeric" })}
              </div>
              <div className="space-y-1">
                {dayJobs.map((j) => (
                  <Link
                    key={j.id}
                    href={`/app/jobs/${j.id}`}
                    className={`block text-xs rounded px-1.5 py-1 truncate ${
                      STATUS_COLORS[j.status] || "bg-gray-100 text-gray-800"
                    }`}
                  >
                    #{j.jobNumber} {j.customer.name}
                    {j.assignedTo ? ` - ${j.assignedTo.name}` : ""}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
