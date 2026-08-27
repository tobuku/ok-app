"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { showError } from "@/lib/toast";
import { SignaturePad, type SignaturePadHandle } from "@/components/signature-pad";
import { CreditCard, Banknote } from "lucide-react";

export function AcceptDeclineButtons({
  quoteId,
  jobId,
  totalCents,
  stripeConnected,
}: {
  quoteId: string;
  jobId: string;
  totalCents: number;
  stripeConnected: boolean;
}) {
  const router = useRouter();
  const [acting, setActing] = useState(false);
  const [phase, setPhase] = useState<"sign" | "pay" | "done-accepted" | "done-declined">("sign");
  const [customerEmail, setCustomerEmail] = useState("");
  const [hasSig, setHasSig] = useState(false);
  const sigPadRef = useRef<SignaturePadHandle>(null);
  const [cardUrl, setCardUrl] = useState<string | null>(null);

  /** Step 1: Accept the quote via API */
  async function handleAccept() {
    setActing(true);
    try {
      const body: Record<string, string> = {};
      if (customerEmail.trim()) body.customerEmail = customerEmail.trim();
      if (sigPadRef.current) {
        const sigData = sigPadRef.current.getSignatureData();
        if (sigData) body.signatureData = sigData;
      }

      const res = await fetch(`/api/org/quotes/${quoteId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || "Failed to accept");
        setActing(false);
        return;
      }
      // Quote accepted — move to payment phase
      setPhase("pay");
    } catch {
      showError("Network error");
    } finally {
      setActing(false);
    }
  }

  /** Step 2a: Pay by card — create Stripe Checkout and redirect */
  async function handleCard() {
    setActing(true);
    try {
      const res = await fetch(`/api/org/jobs/${jobId}/pay/card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || "Failed to create payment link");
        setActing(false);
        return;
      }
      // Redirect customer to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        setCardUrl(data.url);
        setActing(false);
      }
    } catch {
      showError("Network error");
      setActing(false);
    }
  }

  /** Step 2b: Pay cash */
  async function handleCash() {
    if (!confirm(`Record $${(totalCents / 100).toFixed(2)} paid in cash?`)) return;
    setActing(true);
    try {
      const res = await fetch(`/api/org/jobs/${jobId}/pay/cash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: totalCents }),
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || "Failed to record payment");
        setActing(false);
        return;
      }
      setPhase("done-accepted");
      setTimeout(() => router.push(`/m/jobs/${jobId}`), 2000);
    } catch {
      showError("Network error");
      setActing(false);
    }
  }

  /** Decline — leadman action */
  async function handleDecline() {
    const confirmed = window.confirm("Are you sure the customer is declining this quote?");
    if (!confirmed) return;

    setActing(true);
    try {
      const res = await fetch(`/api/org/quotes/${quoteId}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || "Failed to decline");
      } else {
        setPhase("done-declined");
        setTimeout(() => router.push(`/m/jobs/${jobId}`), 2000);
      }
    } catch {
      showError("Network error");
    } finally {
      setActing(false);
    }
  }

  // --- Done states ---
  if (phase === "done-accepted") {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4 text-center">
          <p className="text-green-800 font-medium text-lg">Payment Complete</p>
          <p className="text-green-600 text-sm mt-1">Thank you</p>
        </CardContent>
      </Card>
    );
  }

  if (phase === "done-declined") {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4 text-center">
          <p className="text-red-800 font-medium">Quote Declined</p>
        </CardContent>
      </Card>
    );
  }

  // --- Payment phase (quote already accepted) ---
  if (phase === "pay") {
    if (cardUrl) {
      return (
        <div className="space-y-3">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 text-center">
              <p className="text-primary font-medium mb-2">Payment link ready</p>
              <Button asChild>
                <a href={cardUrl} target="_blank" rel="noopener noreferrer" className="h-12">
                  Open Payment Page
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
          <CardContent className="p-4 text-center">
            <p className="text-green-800 dark:text-green-400 font-medium">Quote Accepted</p>
            <p className="text-green-600 dark:text-green-500 text-sm mt-1">
              Total: ${(totalCents / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <p className="text-sm font-medium text-center text-foreground">How would you like to pay?</p>

        {stripeConnected && (
          <Button
            onClick={handleCard}
            disabled={acting}
            className="w-full h-14 text-lg font-bold"
          >
            <CreditCard className="h-5 w-5 mr-2" />
            {acting ? "Setting up..." : "Pay by Card"}
          </Button>
        )}

        <Button
          onClick={handleCash}
          disabled={acting}
          className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 text-white"
        >
          <Banknote className="h-5 w-5 mr-2" />
          {acting ? "Recording..." : "Pay Cash"}
        </Button>

        {!stripeConnected && (
          <p className="text-xs text-muted-foreground text-center">
            Card payments unavailable — Stripe not connected
          </p>
        )}
      </div>
    );
  }

  // --- Sign + Accept phase (initial) ---
  return (
    <div className="space-y-3 pt-2">
      {/* Customer email for receipt */}
      <div className="space-y-1">
        <Label htmlFor="customer-email" className="text-xs text-muted-foreground">
          Customer Email (for receipt)
        </Label>
        <Input
          id="customer-email"
          type="email"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          placeholder="customer@example.com"
        />
      </div>

      {/* Signature capture */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Customer Signature</Label>
        <SignaturePad
          ref={sigPadRef}
          onChange={(isEmpty) => setHasSig(!isEmpty)}
        />
      </div>

      {/* Accept + Pay — customer-facing */}
      <Button
        type="button"
        onClick={handleAccept}
        disabled={acting || !hasSig}
        className="w-full bg-green-600 hover:bg-green-700 text-white h-14 text-lg font-bold"
      >
        {acting ? "..." : "Accept Quote & Pay"}
      </Button>

      {/* Decline — leadman-facing, visually separated */}
      <div className="pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center mb-2">Leadman only</p>
        <Button
          type="button"
          variant="outline"
          onClick={handleDecline}
          disabled={acting}
          className="w-full h-12 text-sm font-medium text-red-600 border-red-200 hover:bg-red-50"
        >
          Customer Declined
        </Button>
      </div>
    </div>
  );
}
