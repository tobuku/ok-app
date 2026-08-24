import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/format";

/** GET /api/org/reports/export — CSV export of jobs + payments */
export async function GET(req: NextRequest) {
  const user = await requireOrgUser(["ORG_ADMIN"]);
  if (user instanceof Response) return user;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = { orgId: user.orgId };
  if (from || to) {
    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.gte = new Date(from + "T00:00:00");
    if (to) dateFilter.lte = new Date(to + "T23:59:59.999");
    where.createdAt = dateFilter;
  }

  const jobs = await prisma.job.findMany({
    where,
    include: {
      customer: { select: { name: true, phone: true, email: true } },
      address: { select: { line1: true, city: true, state: true, zip: true } },
      assignedTo: { select: { name: true } },
      payments: {
        where: { status: "SUCCEEDED" },
        select: { method: true, amountCents: true, paidAt: true },
      },
      quotes: {
        where: { status: "ACCEPTED" },
        select: { totalCents: true },
        take: 1,
      },
    },
    orderBy: { jobNumber: "asc" },
  });

  // Build CSV
  const headers = [
    "Job #",
    "Status",
    "Customer",
    "Phone",
    "Email",
    "Address",
    "City",
    "State",
    "Zip",
    "Scheduled Date",
    "Assigned To",
    "Quote Total",
    "Payment Method",
    "Payment Amount",
    "Paid At",
    "Created At",
  ];

  const rows = jobs.map((job) => {
    const payment = job.payments[0];
    const quote = job.quotes[0];
    return [
      job.jobNumber,
      job.status,
      csvEscape(job.customer.name),
      job.customer.phone ?? "",
      job.customer.email ?? "",
      csvEscape(job.address?.line1 ?? ""),
      job.address?.city ?? "",
      job.address?.state ?? "",
      job.address?.zip ?? "",
      job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString() : "",
      job.assignedTo?.name ?? "",
      quote ? formatCents(quote.totalCents) : "",
      payment?.method ?? "",
      payment ? formatCents(payment.amountCents) : "",
      payment?.paidAt ? new Date(payment.paidAt).toLocaleDateString() : "",
      new Date(job.createdAt).toLocaleDateString(),
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="jobs-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

function csvEscape(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
