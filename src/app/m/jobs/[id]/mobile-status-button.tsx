"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { showError } from "@/lib/toast";

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
      showError(data.error || "Failed");
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      variant={isCancel ? "destructive" : primary ? "default" : "outline"}
      className={`w-full h-12 text-sm font-semibold ${
        isCancel
          ? ""
          : !primary
          ? "text-foreground"
          : ""
      }`}
    >
      {loading ? "Updating..." : label}
    </Button>
  );
}
