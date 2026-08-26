"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { showError } from "@/lib/toast";

export function StripeConnectButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      const res = await fetch("/api/org/stripe/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || "Failed to start Stripe onboarding");
        setLoading(false);
        return;
      }
      // Redirect to Stripe onboarding
      window.location.href = data.url;
    } catch {
      showError("Network error");
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleConnect} disabled={loading}>
      {loading ? "Redirecting..." : label}
    </Button>
  );
}
