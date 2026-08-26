import Link from "next/link";
import type { JobStatus } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge, getStatusBorderColor } from "@/components/status-badge";
import { cn } from "@/lib/utils";

interface JobCardProps {
  id: string;
  jobNumber: number;
  status: JobStatus;
  customerName: string;
  assigneeName?: string | null;
  scheduledDate?: string | null;
}

export function JobCard({ id, jobNumber, status, customerName, assigneeName, scheduledDate }: JobCardProps) {
  const initials = assigneeName
    ? assigneeName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : null;

  return (
    <Link href={`/app/jobs/${id}`}>
      <Card className={cn(
        "p-3 hover:shadow-md transition-shadow border-l-4 cursor-pointer",
        getStatusBorderColor(status)
      )}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-mono text-muted-foreground">#{jobNumber}</p>
            <p className="text-sm font-medium truncate">{customerName}</p>
            {scheduledDate && (
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(scheduledDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {initials && (
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
