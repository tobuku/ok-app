"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { showError } from "@/lib/toast";
import { PaymentHandoff } from "./payment-handoff";

export function PaymentButtons({
  jobId,
  totalCents,
  stripeConnected,
  customerPhone,
}: {
  jobId: string;
  totalCents: number;
  stripeConnected: boolean;
  customerPhone: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"card" | "cash" | "check" | null>(null);
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
        showError(data.error || "Failed to create payment link");
        setLoading(null);
        return;
      }
      setCardUrl(data.url);
    } catch {
      showError("Network error");
      setLoading(null);
    }
  }

  async function handleOffline(payMethod: "CASH" | "CHECK") {
    const label = payMethod === "CHECK" ? "check" : "cash";
    if (!confirm(`Record $${(totalCents / 100).toFixed(2)} paid by ${label}?`)) return;

    setLoading(payMethod === "CHECK" ? "check" : "cash");
    try {
      const res = await fetch(`/api/org/jobs/${jobId}/pay/cash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: totalCents, method: payMethod }),
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || "Failed to record payment");
        setLoading(null);
        return;
      }
      router.refresh();
    } catch {
      showError("Network error");
      setLoading(null);
    }
  }

  if (cardUrl) {
    return (
      <div className="space-y-3">
        <PaymentHandoff
          checkoutUrl={cardUrl}
          customerPhone={customerPhone}
          jobId={jobId}
          onPaid={() => router.refresh()}
        />
        <Button
          variant="link"
          onClick={() => { setCardUrl(null); setLoading(null); }}
          className="w-full text-sm text-muted-foreground"
        >
          Back to payment options
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Collect Payment</p>

      {stripeConnected && (
        <Button
          onClick={handleCard}
          disabled={loading !== null}
          className="w-full h-12 text-sm font-semibold"
        >
          {loading === "card" ? "Creating link..." : "Pay by Card"}
        </Button>
      )}

      <Button
        onClick={() => handleOffline("CASH")}
        disabled={loading !== null}
        className="w-full h-12 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white"
      >
        {loading === "cash" ? "Recording..." : "Paid Cash"}
      </Button>

      <Button
        onClick={() => handleOffline("CHECK")}
        disabled={loading !== null}
        className="w-full h-12 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
      >
        {loading === "check" ? "Recording..." : "Paid Check"}
      </Button>

      {!stripeConnected && (
        <p className="text-xs text-muted-foreground text-center">
          Card payments unavailable — Stripe not connected
        </p>
      )}
    </div>
  );
}
