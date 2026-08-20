"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AcceptDeclineButtons({
  quoteId,
  jobId,
}: {
  quoteId: string;
  jobId: string;
}) {
  const router = useRouter();
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);

  async function handleAction(action: "accept" | "decline") {
    if (action === "decline") {
      const confirmed = window.confirm("Are you sure you want to decline this quote?");
      if (!confirmed) return;
    }

    setActing(true);
    setError(null);

    try {
      const res = await fetch(`/api/org/quotes/${quoteId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Failed to ${action}`);
      } else {
        setDone(action === "accept" ? "accepted" : "declined");
        // Refresh the page after a moment
        setTimeout(() => router.push(`/m/jobs/${jobId}`), 2000);
      }
    } catch {
      setError("Network error");
    } finally {
      setActing(false);
    }
  }

  if (done === "accepted") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <p className="text-green-800 font-medium text-lg">Quote Accepted</p>
        <p className="text-green-600 text-sm mt-1">Thank you</p>
      </div>
    );
  }

  if (done === "declined") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-800 font-medium">Quote Declined</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2">
      {error && <p className="text-red-600 text-xs text-center">{error}</p>}
      <button
        type="button"
        onClick={() => handleAction("accept")}
        disabled={acting}
        className="w-full py-4 rounded-xl font-bold text-white text-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
      >
        {acting ? "..." : "Accept Quote"}
      </button>
      <button
        type="button"
        onClick={() => handleAction("decline")}
        disabled={acting}
        className="w-full py-3 rounded-xl font-medium text-red-600 text-sm border border-red-200 hover:bg-red-50 disabled:bg-gray-100"
      >
        Decline
      </button>
    </div>
  );
}
