import type { JobStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<JobStatus, { label: string; className: string }> = {
  NEW: { label: "New", className: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" },
  SCHEDULED: { label: "Scheduled", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  EN_ROUTE: { label: "En Route", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  ON_SITE: { label: "On Site", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  QUOTED: { label: "Quoted", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  ACCEPTED: { label: "Accepted", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  DECLINED: { label: "Declined", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  IN_PROGRESS: { label: "In Progress", className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400" },
  COMPLETED: { label: "Completed", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  PAID: { label: "Paid", className: "bg-green-200 text-green-900 dark:bg-green-900/40 dark:text-green-300" },
  CANCELED: { label: "Canceled", className: "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400" },
};

const BORDER_COLORS: Record<JobStatus, string> = {
  NEW: "border-l-neutral-400",
  SCHEDULED: "border-l-blue-500",
  EN_ROUTE: "border-l-yellow-500",
  ON_SITE: "border-l-orange-500",
  QUOTED: "border-l-purple-500",
  ACCEPTED: "border-l-emerald-500",
  DECLINED: "border-l-red-500",
  IN_PROGRESS: "border-l-indigo-500",
  COMPLETED: "border-l-green-500",
  PAID: "border-l-green-600",
  CANCELED: "border-l-neutral-400",
};

export function StatusBadge({ status, className }: { status: JobStatus; className?: string }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn("border-0", config.className, className)}>
      {config.label}
    </Badge>
  );
}

export function getStatusBorderColor(status: JobStatus): string {
  return BORDER_COLORS[status];
}

export function getStatusLabel(status: JobStatus): string {
  return STATUS_CONFIG[status].label;
}
