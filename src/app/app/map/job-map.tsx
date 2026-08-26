"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { haversineDistance, optimizeRoute } from "@/lib/geo-utils";

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

const STATUS_COLORS: Record<string, string> = {
  NEW: "#6b7280",
  SCHEDULED: "#3b82f6",
  EN_ROUTE: "#8b5cf6",
  ON_SITE: "#f59e0b",
  QUOTED: "#f97316",
  ACCEPTED: "#10b981",
  IN_PROGRESS: "#06b6d4",
  COMPLETED: "#22c55e",
  PAID: "#16a34a",
  CANCELED: "#ef4444",
  DECLINED: "#ef4444",
};

export function JobMap() {
  const [jobs, setJobs] = useState<MapJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const [routeOrder, setRouteOrder] = useState<number[] | null>(null);

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

  // Clear route when jobs or filters change
  useEffect(() => { setRouteOrder(null); }, [jobs]);

  // Compute distances and sort jobs by distance from user
  const jobsWithDistance = useMemo(() => {
    if (!userLocation) return jobs.map((j) => ({ ...j, distance: null as number | null }));
    return jobs
      .map((j) => ({
        ...j,
        distance: haversineDistance(userLocation.lat, userLocation.lng, j.address.lat, j.address.lng),
      }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }, [jobs, userLocation]);

  function handleLocateMe() {
    if (!navigator.geolocation) {
      setLocError("Geolocation not supported by this browser.");
      return;
    }
    setLocating(true);
    setLocError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setLocError(err.message || "Unable to get location.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleOptimizeRoute() {
    if (!userLocation || jobs.length === 0) return;
    const points = jobs.map((j) => ({ lat: j.address.lat, lng: j.address.lng }));
    const order = optimizeRoute(userLocation, points);
    setRouteOrder(order);
  }

  function handleClearRoute() {
    setRouteOrder(null);
  }

  return (
    <div className="space-y-3">
      {/* Filters and action buttons */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <Label className="text-xs mb-1 block">Status</Label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs mb-1 block">Date</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-auto"
          />
        </div>
        <button
          onClick={handleLocateMe}
          disabled={locating}
          className="h-9 px-3 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {locating ? "Locating..." : userLocation ? "Update Location" : "Locate Me"}
        </button>
        {userLocation && !routeOrder && jobs.length > 0 && (
          <button
            onClick={handleOptimizeRoute}
            className="h-9 px-3 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            Optimize Route
          </button>
        )}
        {routeOrder && (
          <button
            onClick={handleClearRoute}
            className="h-9 px-3 rounded-md border border-input bg-transparent text-sm font-medium hover:bg-accent transition-colors"
          >
            Clear Route
          </button>
        )}
        <span className="text-xs text-muted-foreground pb-2">
          {loading ? "Loading..." : `${jobs.length} job${jobs.length !== 1 ? "s" : ""} with addresses`}
        </span>
        {locError && <span className="text-xs text-red-500 pb-2">{locError}</span>}
      </div>

      {/* Split view: list + map */}
      <div className="flex flex-col lg:flex-row gap-3" style={{ minHeight: "500px" }}>
        {/* Job list panel */}
        <div className="w-full lg:w-1/3 order-2 lg:order-1 overflow-auto rounded-md border border-input bg-card" style={{ maxHeight: "500px" }}>
          {loading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : jobsWithDistance.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              No jobs with geocoded addresses found.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {jobsWithDistance.map((job, idx) => {
                // If route is active, find this job's route position
                let routeNum: number | undefined;
                if (routeOrder) {
                  const origIdx = jobs.findIndex((j) => j.id === job.id);
                  const routePos = routeOrder.indexOf(origIdx);
                  if (routePos !== -1) routeNum = routePos + 1;
                }

                return (
                  <li key={job.id}>
                    <a
                      href={`/app/jobs/${job.id}`}
                      className="block px-3 py-2.5 hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        {routeNum !== undefined && (
                          <span
                            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
                            style={{ background: STATUS_COLORS[job.status] || "#6b7280" }}
                          >
                            {routeNum}
                          </span>
                        )}
                        {routeNum === undefined && (
                          <span
                            className="flex-shrink-0 w-2.5 h-2.5 rounded-full mt-1.5"
                            style={{ background: STATUS_COLORS[job.status] || "#6b7280" }}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">
                            #{job.jobNumber} — {job.customer.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {job.address.line1}, {job.address.city}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              {job.status.replace("_", " ")}
                            </span>
                            {job.distance !== null && (
                              <span className="text-xs font-medium text-blue-600">
                                {job.distance < 0.1
                                  ? "< 0.1 mi"
                                  : `${job.distance.toFixed(1)} mi`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Map panel */}
        <div className="w-full lg:w-2/3 order-1 lg:order-2 rounded-md overflow-hidden border border-input" style={{ height: "500px" }}>
          {loading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <MapView
              jobs={jobs}
              userLocation={userLocation}
              routeOrder={routeOrder}
            />
          )}
        </div>
      </div>
    </div>
  );
}
