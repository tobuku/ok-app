"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { showError } from "@/lib/toast";

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
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 text-center">
            <p className="text-primary font-medium mb-2">Payment link ready</p>
            <Button asChild>
              <a
                href={cardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-12"
              >
                Open Payment Page
              </a>
            </Button>
            <p className="text-xs text-primary/70 mt-2">
              Show this to the customer or share the link
            </p>
          </CardContent>
        </Card>
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
        onClick={handleCash}
        disabled={loading !== null}
        className="w-full h-12 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white"
      >
        {loading === "cash" ? "Recording..." : "Paid Cash"}
      </Button>

      {!stripeConnected && (
        <p className="text-xs text-muted-foreground text-center">
          Card payments unavailable — Stripe not connected
        </p>
      )}
    </div>
  );
}
