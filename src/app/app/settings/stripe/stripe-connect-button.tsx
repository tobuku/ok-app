"use client";

import { useState } from "react";

export function StripeConnectButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      const res = await fetch("/api/org/stripe/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to start Stripe onboarding");
        setLoading(false);
        return;
      }
      // Redirect to Stripe onboarding
      window.location.href = data.url;
    } catch {
      alert("Network error");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-indigo-700"
    >
      {loading ? "Redirecting..." : label}
    </button>
  );
}
