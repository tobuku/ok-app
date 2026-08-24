"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

// Lazy-load the actual map component (Leaflet requires window/document)
const MapView = dynamic(() => import("./map-view"), { ssr: false });

type MapJob = {
  id: string;
  jobNumber: number;
  status: string;
  scheduledDate: string | null;
  notes: string | null;
  customer: { name: string; phone: string | null };
  address: {
    line1: string;
    city: string;
    state: string;
    zip: string;
    lat: number;
    lng: number;
  };
  assignedTo: { name: string } | null;
};

const STATUSES = [
  "NEW", "SCHEDULED", "EN_ROUTE", "ON_SITE", "QUOTED",
  "ACCEPTED", "IN_PROGRESS", "COMPLETED", "PAID",
];

export function JobMap() {
  const [jobs, setJobs] = useState<MapJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (date) params.set("date", date);
    try {
      const res = await fetch(`/api/org/jobs/map-data?${params}`);
      if (res.ok) setJobs(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [status, date]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-gray-200 rounded px-3 py-1.5 text-sm"
          >
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-200 rounded px-3 py-1.5 text-sm"
          />
        </div>
        <span className="text-xs text-gray-400 pb-1">
          {loading ? "Loading..." : `${jobs.length} job${jobs.length !== 1 ? "s" : ""} with addresses`}
        </span>
      </div>

      {/* Map */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" style={{ height: "500px" }}>
        <MapView jobs={jobs} />
      </div>

      {/* Note about geocoding */}
      {!loading && jobs.length === 0 && (
        <p className="text-sm text-gray-500">
          No jobs with geocoded addresses found. Jobs need lat/lng coordinates on their address to appear on the map.
        </p>
      )}
    </div>
  );
}
