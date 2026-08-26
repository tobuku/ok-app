"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

function createIcon(color: string, routeIndex?: number) {
  if (routeIndex !== undefined) {
    return L.divIcon({
      className: "",
      html: `<div style="
        width: 28px; height: 28px; border-radius: 50%;
        background: ${color}; border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
        color: white; font-size: 11px; font-weight: 700;
        font-family: system-ui, sans-serif;
      ">${routeIndex}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -16],
    });
  }
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 28px; height: 28px; border-radius: 50%;
      background: ${color}; border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

const userIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3);animation:pulse 2s infinite"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

type MapViewProps = {
  jobs: MapJob[];
  userLocation?: { lat: number; lng: number } | null;
  routeOrder?: number[] | null;
};

export default function MapView({ jobs, userLocation, routeOrder }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create map if not exists
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        // Default center: Honolulu
        center: [21.3069, -157.8583],
        zoom: 11,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Clear existing markers and polylines
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    // Build route index lookup: jobIndex -> display number
    const routeIndexMap = new Map<number, number>();
    if (routeOrder && routeOrder.length > 0) {
      routeOrder.forEach((jobIdx, position) => {
        routeIndexMap.set(jobIdx, position + 1);
      });
    }

    // Add job markers
    const markers: L.Marker[] = [];
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      const color = STATUS_COLORS[job.status] || "#6b7280";
      const routeNum = routeIndexMap.get(i);
      const marker = L.marker([job.address.lat, job.address.lng], {
        icon: createIcon(color, routeNum),
      });

      const dateStr = job.scheduledDate
        ? new Date(job.scheduledDate).toLocaleDateString("en-US", {
            month: "short", day: "numeric",
          })
        : "Unscheduled";

      marker.bindPopup(`
        <div style="min-width:180px; font-family: system-ui, sans-serif;">
          <div style="font-weight:600; font-size:14px; margin-bottom:4px;">
            ${routeNum ? `<span style="background:#3b82f6;color:white;border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;margin-right:4px;">${routeNum}</span>` : ""}#${job.jobNumber} — ${job.customer.name}
          </div>
          <div style="font-size:12px; color:#666; margin-bottom:2px;">
            ${job.address.line1}, ${job.address.city}
          </div>
          <div style="font-size:12px; color:#666; margin-bottom:4px;">
            ${dateStr} &bull; ${job.status.replace("_", " ")}
          </div>
          ${job.assignedTo ? `<div style="font-size:12px; color:#666;">Assigned: ${job.assignedTo.name}</div>` : ""}
          ${job.customer.phone ? `<div style="font-size:12px; margin-top:4px;"><a href="tel:${job.customer.phone}" style="color:#2563eb;">${job.customer.phone}</a></div>` : ""}
          <div style="margin-top:6px;">
            <a href="/app/jobs/${job.id}" style="font-size:12px; color:#2563eb; text-decoration:none;">View Job &rarr;</a>
          </div>
        </div>
      `);

      marker.addTo(map);
      markers.push(marker);
    }

    // Add user location marker
    if (userLocation) {
      const uMarker = L.marker([userLocation.lat, userLocation.lng], {
        icon: userIcon,
        zIndexOffset: 1000,
      });
      uMarker.bindPopup(`<div style="font-family:system-ui,sans-serif;font-size:13px;font-weight:600;">Your Location</div>`);
      uMarker.addTo(map);
      markers.push(uMarker);
    }

    // Draw route polyline
    if (routeOrder && routeOrder.length > 0) {
      const routeCoords: L.LatLngExpression[] = [];
      // Start from user location if available
      if (userLocation) {
        routeCoords.push([userLocation.lat, userLocation.lng]);
      }
      for (const idx of routeOrder) {
        if (jobs[idx]) {
          routeCoords.push([jobs[idx].address.lat, jobs[idx].address.lng]);
        }
      }
      if (routeCoords.length >= 2) {
        L.polyline(routeCoords, {
          color: "#3b82f6",
          weight: 2,
          dashArray: "8,8",
        }).addTo(map);
      }
    }

    // Fit bounds if there are markers
    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.1));
    }

    return () => {
      // Don't destroy map, just clear layers on re-render
    };
  }, [jobs, userLocation, routeOrder]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 4px rgba(59,130,246,0.3); }
          50% { box-shadow: 0 0 0 8px rgba(59,130,246,0.1); }
          100% { box-shadow: 0 0 0 4px rgba(59,130,246,0.3); }
        }
      `}</style>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </>
  );
}
