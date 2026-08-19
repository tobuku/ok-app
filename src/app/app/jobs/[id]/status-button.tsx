"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function JobStatusButton({
  jobId,
  newStatus,
  label,
}: {
  jobId: string;
  newStatus: string;
  label: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const isCancel = newStatus === "CANCELED";

  async function handleClick() {
    if (isCancel && !confirm("Cancel this job?")) return;

    setLoading(true);
    const res = await fetch(`/api/org/jobs/${jobId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: newStatus,
        ...(isCancel && { cancelReason: prompt("Reason for cancellation:") }),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Failed to update status");
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`px-3 py-1.5 text-sm rounded-md font-medium disabled:opacity-50 ${
        isCancel
          ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
          : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
      }`}
    >
      {loading ? "..." : label}
    </button>
  );
}
