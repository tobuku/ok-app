/**
 * /m/history — Leadman past jobs
 * Shows completed, paid, and canceled jobs assigned to the current leadman.
 */
import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tenantScope } from "@/lib/tenant";
import Link from "next/link";
import type { JobStatus } from "@prisma/client";
import { ChevronRight, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge, getStatusBorderColor } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PastJob = {
  id: string;
  jobNumber: number;
  status: JobStatus;
  scheduledDate: string | null;
  completedAt: string | null;
  notes: string | null;
  customer: { name: string; phone: string | null };
  address: { line1: string; city: string; state: string; zip: string } | null;
};

export default async function HistoryPage() {
  const result = await resolveAuth();
  if (!result.ok) redirect("/login");
  if (!("user" in result)) redirect("/platform");
  const { user } = result;

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  const where: Record<string, unknown> = {
    status: { in: ["COMPLETED", "PAID", "CANCELED"] },
  };
  if (user.role === "LEADMAN") where.assignedToId = user.id;

  const jobs = (await t.findMany("job", {
    where,
    include: {
      customer: { select: { name: true, phone: true } },
      address: { select: { line1: true, city: true, state: true, zip: true } },
    },
    orderBy: { completedAt: "desc" },
    take: 50,
  })) as PastJob[];

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Past Jobs</h1>
      <p className="text-sm text-muted-foreground mb-4">
        {jobs.length} job{jobs.length !== 1 ? "s" : ""}
      </p>

      {jobs.length === 0 ? (
        <EmptyState title="No past jobs yet" className="mt-12" />
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link key={job.id} href={`/m/jobs/${job.id}`}>
              <Card
                className={cn(
                  "p-4 active:bg-accent transition-colors border-l-4",
                  getStatusBorderColor(job.status)
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">
                        #{job.jobNumber}
                      </span>
                      <StatusBadge status={job.status} />
                      {job.completedAt && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(job.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="font-medium truncate">{job.customer.name}</p>
                    {job.address && (
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {job.address.line1}, {job.address.city}
                      </p>
                    )}
                    {job.notes && (
                      <p className="text-xs text-muted-foreground/70 mt-1 truncate">
                        {job.notes}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/40 shrink-0 mt-1" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
