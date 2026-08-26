"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { showError } from "@/lib/toast";

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
    if (isCancel && !window.confirm("Cancel this job?")) return;

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
      showError(data.error || "Failed to update status");
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <Button
      variant={isCancel ? "destructive" : "outline"}
      size="sm"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? "..." : label}
    </Button>
  );
}
