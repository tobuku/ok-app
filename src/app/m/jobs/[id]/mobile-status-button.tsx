"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MobileStatusButton({
  jobId,
  newStatus,
  label,
  primary,
}: {
  jobId: string;
  newStatus: string;
  label: string;
  primary: boolean;
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
        ...(isCancel && { cancelReason: prompt("Reason:") }),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Failed");
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`w-full py-3 rounded-lg text-sm font-semibold disabled:opacity-50 ${
        isCancel
          ? "bg-white border-2 border-red-300 text-red-600"
          : primary
          ? "bg-blue-600 text-white active:bg-blue-700"
          : "bg-white border-2 border-gray-300 text-gray-700"
      }`}
    >
      {loading ? "Updating..." : label}
    </button>
  );
}
