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

function createIcon(color: string) {
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

export default function MapView({ jobs }: { jobs: MapJob[] }) {
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

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    // Add job markers
    const markers: L.Marker[] = [];
    for (const job of jobs) {
      const color = STATUS_COLORS[job.status] || "#6b7280";
      const marker = L.marker([job.address.lat, job.address.lng], {
        icon: createIcon(color),
      });

      const dateStr = job.scheduledDate
        ? new Date(job.scheduledDate).toLocaleDateString("en-US", {
            month: "short", day: "numeric",
          })
        : "Unscheduled";

      marker.bindPopup(`
        <div style="min-width:180px; font-family: system-ui, sans-serif;">
          <div style="font-weight:600; font-size:14px; margin-bottom:4px;">
            #${job.jobNumber} — ${job.customer.name}
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

    // Fit bounds if there are markers
    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.1));
    }

    // Cleanup on unmount
    return () => {
      // Don't destroy map, just clear markers on re-render
    };
  }, [jobs]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
