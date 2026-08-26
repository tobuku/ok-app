"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCents } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CHART_COLORS = [
  "hsl(0, 0%, 15%)",
  "hsl(0, 0%, 35%)",
  "hsl(0, 0%, 55%)",
  "hsl(0, 0%, 75%)",
  "hsl(0, 0%, 88%)",
];

type Summary = {
  period: { from: string; to: string };
  jobsByStatus: Record<string, number>;
  revenue: { totalCents: number; count: number };
  paymentsByMethod: { method: string; totalCents: number; count: number }[];
  quotes: { created: number; accepted: number; declined: number; conversionRate: number };
  dumpCosts: { totalCents: number; runCount: number };
  leadmanPerformance: { userId: string; name: string; jobsCompleted: number }[];
};

export function ReportsDashboard() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  // Default to current month
  const now = new Date();
  const [from, setFrom] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  );
  const [to, setTo] = useState(now.toISOString().slice(0, 10));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      const res = await fetch(`/api/org/reports/summary?${params}`);
      if (res.ok) setData(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  function exportCSV() {
    const params = new URLSearchParams({ from, to });
    window.open(`/api/org/reports/export?${params}`, "_blank");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-end gap-3 flex-wrap">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-7 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-4 w-40 mb-3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4 mt-2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-destructive">Failed to load reports.</p>;
  }

  const netRevenue = data.revenue.totalCents - data.dumpCosts.totalCents;

  const jobStatusData = Object.entries(data.jobsByStatus).map(([status, count]) => ({
    status: status.replace("_", " "),
    count,
  }));

  const funnelData = [
    { stage: "Created", count: data.quotes.created },
    { stage: "Accepted", count: data.quotes.accepted },
    { stage: "Declined", count: data.quotes.declined },
  ];

  const leadmanData = [...data.leadmanPerformance].sort(
    (a, b) => b.jobsCompleted - a.jobsCompleted
  );

  return (
    <div className="space-y-6">
      {/* Date range + export */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <Label className="text-xs text-muted-foreground mb-1">From</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-auto"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1">To</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-auto"
          />
        </div>
        <Button variant="secondary" size="sm" onClick={exportCSV}>
          Export CSV
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard label="Revenue" value={formatCents(data.revenue.totalCents)} sub={`${data.revenue.count} payment${data.revenue.count !== 1 ? "s" : ""}`} />
        <MetricCard label="Dump Costs" value={formatCents(data.dumpCosts.totalCents)} sub={`${data.dumpCosts.runCount} run${data.dumpCosts.runCount !== 1 ? "s" : ""}`} />
        <MetricCard label="Net Revenue" value={formatCents(netRevenue)} sub="" color={netRevenue >= 0 ? "text-green-700 dark:text-green-400" : "text-destructive"} />
        <MetricCard label="Conversion" value={`${data.quotes.conversionRate}%`} sub={`${data.quotes.accepted} of ${data.quotes.created} quotes`} />
      </div>

      {/* Jobs by Status — horizontal bar chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Jobs by Status (All Time)</CardTitle>
        </CardHeader>
        <CardContent>
          {jobStatusData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jobs found.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, jobStatusData.length * 36)}>
              <BarChart data={jobStatusData} layout="vertical">
                <XAxis type="number" />
                <YAxis type="category" dataKey="status" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--foreground))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods — donut pie chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Payments by Method</CardTitle>
        </CardHeader>
        <CardContent>
          {data.paymentsByMethod.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments in this period.</p>
          ) : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.paymentsByMethod}
                    dataKey="totalCents"
                    nameKey="method"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    label={({ method }) => method}
                  >
                    {data.paymentsByMethod.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCents(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend with counts */}
              <div className="flex flex-wrap gap-4 mt-2 text-sm">
                {data.paymentsByMethod.map((p, i) => (
                  <div key={p.method} className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-3 h-3 rounded-sm"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="text-muted-foreground">{p.method} ({p.count})</span>
                    <span className="font-medium text-foreground">{formatCents(p.totalCents)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quote Funnel — vertical bar chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Quote Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={funnelData}>
              <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {funnelData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Conversion rate: {data.quotes.conversionRate}%
          </p>
        </CardContent>
      </Card>

      {/* Leadman Performance — horizontal bar chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Leadman Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {leadmanData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed jobs in this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, leadmanData.length * 36)}>
              <BarChart
                data={leadmanData.map((lm) => ({ name: lm.name, jobs: lm.jobsCompleted }))}
                layout="vertical"
              >
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="jobs" fill="hsl(var(--foreground))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground uppercase font-medium">{label}</p>
        <p className={`text-xl font-bold mt-1 ${color || "text-foreground"}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}
