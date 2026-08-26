"use client";

import { useState, useEffect } from "react";
import { formatCents } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Metrics = {
  mrrCents: number;
  activeOrgs: number;
  trialingOrgs: number;
  totalOrgs: number;
  totalUsers: number;
  totalJobs: number;
  orgsByStatus: Record<string, number>;
};

const CHART_COLORS = [
  "hsl(0, 0%, 15%)",
  "hsl(0, 0%, 35%)",
  "hsl(0, 0%, 55%)",
  "hsl(0, 0%, 75%)",
  "hsl(0, 0%, 88%)",
];

export default function PlatformDashboard() {
  const [data, setData] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/platform/metrics")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-6">Platform Overview</h1>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-4 w-48 mb-3" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-28" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return <p className="text-destructive">Failed to load metrics.</p>;

  const statusData = Object.entries(data.orgsByStatus).map(([status, count]) => ({
    status,
    count,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Platform Overview</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <MetricCard label="MRR" value={formatCents(data.mrrCents)} />
        <MetricCard label="Active Orgs" value={String(data.activeOrgs)} />
        <MetricCard label="Trialing" value={String(data.trialingOrgs)} />
        <MetricCard label="Total Jobs" value={String(data.totalJobs)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Organizations by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  label={({ name, value }) => `${name} (${value})`}
                >
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Totals
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-2">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">
                Total Organizations
              </p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {data.totalOrgs}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">
                Total Users
              </p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {data.totalUsers}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground uppercase font-medium">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
