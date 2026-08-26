"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { showError } from "@/lib/toast";

export function AcceptDeclineButtons({
  quoteId,
  jobId,
}: {
  quoteId: string;
  jobId: string;
}) {
  const router = useRouter();
  const [acting, setActing] = useState(false);
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);
  const [customerEmail, setCustomerEmail] = useState("");

  async function handleAction(action: "accept" | "decline") {
    if (action === "decline") {
      const confirmed = window.confirm("Are you sure you want to decline this quote?");
      if (!confirmed) return;
    }

    setActing(true);

    try {
      const body: Record<string, string> = {};
      if (action === "accept" && customerEmail.trim()) {
        body.customerEmail = customerEmail.trim();
      }

      const res = await fetch(`/api/org/quotes/${quoteId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || `Failed to ${action}`);
      } else {
        setDone(action === "accept" ? "accepted" : "declined");
        // Refresh the page after a moment
        setTimeout(() => router.push(`/m/jobs/${jobId}`), 2000);
      }
    } catch {
      showError("Network error");
    } finally {
      setActing(false);
    }
  }

  if (done === "accepted") {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4 text-center">
          <p className="text-green-800 font-medium text-lg">Quote Accepted</p>
          <p className="text-green-600 text-sm mt-1">Thank you</p>
        </CardContent>
      </Card>
    );
  }

  if (done === "declined") {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4 text-center">
          <p className="text-red-800 font-medium">Quote Declined</p>
        </CardContent>
      </Card>
    );
  }

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

      <Button
        type="button"
        onClick={() => handleAction("accept")}
        disabled={acting}
        className="w-full bg-green-600 hover:bg-green-700 text-white h-14 text-lg font-bold"
      >
        {acting ? "..." : "Accept Quote"}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => handleAction("decline")}
        disabled={acting}
        className="w-full h-12 text-sm font-medium text-red-600 border-red-200 hover:bg-red-50"
      >
        Decline
      </Button>
    </div>
  );
}
