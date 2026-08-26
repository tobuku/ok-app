import { NextRequest, NextResponse } from "next/server";
import { resolveAuth } from "@/lib/auth";
import { tenantScope } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const result = await resolveAuth();
  if (!result.ok || !("user" in result)) {
    return NextResponse.json([], { status: 401 });
  }
  const { user } = result;
  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  const results: { id: string; label: string; sub?: string; href: string; icon: string }[] = [];

  // Search jobs by number or customer name
  const jobNumberMatch = q.match(/^#?(\d+)$/);
  if (jobNumberMatch) {
    const num = parseInt(jobNumberMatch[1], 10);
    const jobs = await t.findMany<{
      id: string;
      jobNumber: number;
      status: string;
      customer: { name: string };
    }>("job", {
      where: { jobNumber: num },
      include: { customer: { select: { name: true } } },
      take: 5,
    });
    for (const job of jobs) {
      results.push({
        id: `job-${job.id}`,
        label: `#${job.jobNumber} — ${job.customer.name}`,
        sub: job.status.replace("_", " "),
        href: `/app/jobs/${job.id}`,
        icon: "job",
      });
    }
  }

  // Search customers by name
  const customers = await t.findMany<{
    id: string;
    name: string;
    phone: string | null;
  }>("customer", {
    where: {
      name: { contains: q, mode: "insensitive" },
    },
    take: 5,
  });
  for (const c of customers) {
    results.push({
      id: `customer-${c.id}`,
      label: c.name,
      sub: c.phone || undefined,
      href: `/app/customers`,
      icon: "customer",
    });
  }

  // Search jobs by customer name (if not already a number search)
  if (!jobNumberMatch) {
    const jobs = await t.findMany<{
      id: string;
      jobNumber: number;
      status: string;
      customer: { name: string };
    }>("job", {
      where: {
        customer: { name: { contains: q, mode: "insensitive" } },
      },
      include: { customer: { select: { name: true } } },
      take: 5,
    });
    for (const job of jobs) {
      results.push({
        id: `job-${job.id}`,
        label: `#${job.jobNumber} — ${job.customer.name}`,
        sub: job.status.replace("_", " "),
        href: `/app/jobs/${job.id}`,
        icon: "job",
      });
    }
  }

  return NextResponse.json(results);
}
