"use client";

import { useState, useEffect } from "react";
import { formatCents } from "@/lib/format";

type Metrics = {
  mrrCents: number;
  activeOrgs: number;
  trialingOrgs: number;
  totalOrgs: number;
  totalUsers: number;
  totalJobs: number;
  orgsByStatus: Record<string, number>;
};

export default function PlatformDashboard() {
  const [data, setData] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/platform/metrics")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-400">Loading metrics...</p>;
  if (!data) return <p className="text-red-400">Failed to load metrics.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Platform Overview</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <MetricCard label="MRR" value={formatCents(data.mrrCents)} />
        <MetricCard label="Active Orgs" value={String(data.activeOrgs)} />
        <MetricCard label="Trialing" value={String(data.trialingOrgs)} />
        <MetricCard label="Total Jobs" value={String(data.totalJobs)} />
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <h2 className="text-sm font-medium text-gray-400 mb-3">Organizations by Status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(data.orgsByStatus).map(([status, count]) => (
            <div key={status} className="text-sm">
              <span className="text-gray-500">{status}</span>
              <span className="ml-2 text-white font-medium">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <p className="text-xs text-gray-500 uppercase font-medium">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}
