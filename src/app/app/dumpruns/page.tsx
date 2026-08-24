import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tenantScope } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { DumpRunManager } from "./dump-run-manager";
import { formatCents } from "@/lib/format";

export const dynamic = "force-dynamic";

type DumpRunRow = {
  id: string;
  runAt: Date;
  weightLbs: number | null;
  feeCents: number | null;
  notes: string | null;
  truck: { id: string; name: string };
  dumpSite: { id: string; name: string };
  dumpRunJobs: { job: { id: string; jobNumber: number } }[];
};

export default async function DumpRunsPage() {
  const result = await resolveAuth();
  if (!result.ok) redirect("/login");
  if (!("user" in result)) redirect("/platform");
  const { user } = result;

  if (user.role === "LEADMAN") redirect("/m");

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  const runs = (await t.findMany("dumpRun", {
    include: {
      truck: { select: { id: true, name: true } },
      dumpSite: { select: { id: true, name: true } },
      dumpRunJobs: { include: { job: { select: { id: true, jobNumber: true } } } },
    },
    orderBy: { runAt: "desc" },
  })) as DumpRunRow[];

  // Load trucks and dump sites for the create form
  const [trucks, dumpSites] = await Promise.all([
    t.findMany<{ id: string; name: string }>("truck", {
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    t.findMany<{ id: string; name: string }>("dumpSite", {
      where: { active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Load recent completed/paid jobs for linking
  const recentJobs = await prisma.job.findMany({
    where: {
      orgId: user.orgId,
      status: { in: ["COMPLETED", "PAID", "IN_PROGRESS"] },
    },
    select: { id: true, jobNumber: true },
    orderBy: { jobNumber: "desc" },
    take: 50,
  });

  // Compute total dump costs
  const totalFeeCents = runs.reduce((sum, r) => sum + (r.feeCents ?? 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dump Runs</h1>
          <p className="text-sm text-gray-500 mt-1">
            {runs.length} run{runs.length !== 1 ? "s" : ""} — Total costs: {formatCents(totalFeeCents)}
          </p>
        </div>
      </div>
      <DumpRunManager
        initialRuns={runs.map((r) => ({
          ...r,
          runAt: r.runAt.toISOString(),
        }))}
        trucks={trucks}
        dumpSites={dumpSites}
        recentJobs={recentJobs}
      />
    </div>
  );
}
