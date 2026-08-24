"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCents } from "@/lib/format";

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
    return <p className="text-sm text-gray-500">Loading reports...</p>;
  }

  if (!data) {
    return <p className="text-sm text-red-600">Failed to load reports.</p>;
  }

  const netRevenue = data.revenue.totalCents - data.dumpCosts.totalCents;

  return (
    <div className="space-y-6">
      {/* Date range + export */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-gray-200 rounded px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border border-gray-200 rounded px-3 py-1.5 text-sm"
          />
        </div>
        <button
          onClick={exportCSV}
          className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200"
        >
          Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card label="Revenue" value={formatCents(data.revenue.totalCents)} sub={`${data.revenue.count} payment${data.revenue.count !== 1 ? "s" : ""}`} />
        <Card label="Dump Costs" value={formatCents(data.dumpCosts.totalCents)} sub={`${data.dumpCosts.runCount} run${data.dumpCosts.runCount !== 1 ? "s" : ""}`} />
        <Card label="Net Revenue" value={formatCents(netRevenue)} sub="" color={netRevenue >= 0 ? "text-green-700" : "text-red-600"} />
        <Card label="Conversion" value={`${data.quotes.conversionRate}%`} sub={`${data.quotes.accepted} of ${data.quotes.created} quotes`} />
      </div>

      {/* Payment methods */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Payments by Method</h2>
        {data.paymentsByMethod.length === 0 ? (
          <p className="text-sm text-gray-400">No payments in this period.</p>
        ) : (
          <div className="space-y-2">
            {data.paymentsByMethod.map((p) => (
              <div key={p.method} className="flex justify-between text-sm">
                <span className="text-gray-600">{p.method} ({p.count})</span>
                <span className="font-medium text-gray-900">{formatCents(p.totalCents)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Jobs by status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Jobs by Status (All Time)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {Object.entries(data.jobsByStatus).map(([status, count]) => (
            <div key={status} className="text-sm">
              <span className="text-gray-500">{status.replace("_", " ")}</span>
              <span className="ml-2 font-medium text-gray-900">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Leadman performance */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Leadman Performance</h2>
        {data.leadmanPerformance.length === 0 ? (
          <p className="text-sm text-gray-400">No completed jobs in this period.</p>
        ) : (
          <div className="space-y-2">
            {data.leadmanPerformance
              .sort((a, b) => b.jobsCompleted - a.jobsCompleted)
              .map((lm) => (
                <div key={lm.userId || "unassigned"} className="flex justify-between text-sm">
                  <span className="text-gray-600">{lm.name}</span>
                  <span className="font-medium text-gray-900">
                    {lm.jobsCompleted} job{lm.jobsCompleted !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Quote funnel */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Quote Funnel</h2>
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-gray-500">Created</span>
            <span className="ml-2 font-medium text-gray-900">{data.quotes.created}</span>
          </div>
          <div>
            <span className="text-gray-500">Accepted</span>
            <span className="ml-2 font-medium text-green-700">{data.quotes.accepted}</span>
          </div>
          <div>
            <span className="text-gray-500">Declined</span>
            <span className="ml-2 font-medium text-red-600">{data.quotes.declined}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <p className="text-xs text-gray-500 uppercase font-medium">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color || "text-gray-900"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
