"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PaymentButtons({
  jobId,
  totalCents,
  stripeConnected,
}: {
  jobId: string;
  totalCents: number;
  stripeConnected: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"card" | "cash" | null>(null);
  const [cardUrl, setCardUrl] = useState<string | null>(null);

  async function handleCard() {
    setLoading("card");
    try {
      const res = await fetch(`/api/org/jobs/${jobId}/pay/card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to create payment link");
        setLoading(null);
        return;
      }
      setCardUrl(data.url);
    } catch {
      alert("Network error");
      setLoading(null);
    }
  }

  async function handleCash() {
    if (!confirm(`Record $${(totalCents / 100).toFixed(2)} paid in cash?`)) return;

    setLoading("cash");
    try {
      const res = await fetch(`/api/org/jobs/${jobId}/pay/cash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: totalCents }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to record payment");
        setLoading(null);
        return;
      }
      router.refresh();
    } catch {
      alert("Network error");
      setLoading(null);
    }
  }

  if (cardUrl) {
    return (
      <div className="space-y-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-blue-800 font-medium mb-2">Payment link ready</p>
          <a
            href={cardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-semibold"
          >
            Open Payment Page
          </a>
          <p className="text-xs text-blue-600 mt-2">
            Show this to the customer or share the link
          </p>
        </div>
        <button
          onClick={() => { setCardUrl(null); setLoading(null); }}
          className="w-full py-2 text-sm text-gray-500 underline"
        >
          Back to payment options
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">Collect Payment</p>

      {stripeConnected && (
        <button
          onClick={handleCard}
          disabled={loading !== null}
          className="w-full py-3 rounded-lg text-sm font-semibold bg-blue-600 text-white active:bg-blue-700 disabled:opacity-50"
        >
          {loading === "card" ? "Creating link..." : "Pay by Card"}
        </button>
      )}

      <button
        onClick={handleCash}
        disabled={loading !== null}
        className="w-full py-3 rounded-lg text-sm font-semibold bg-green-600 text-white active:bg-green-700 disabled:opacity-50"
      >
        {loading === "cash" ? "Recording..." : "Paid Cash"}
      </button>

      {!stripeConnected && (
        <p className="text-xs text-gray-400 text-center">
          Card payments unavailable — Stripe not connected
        </p>
      )}
    </div>
  );
}
