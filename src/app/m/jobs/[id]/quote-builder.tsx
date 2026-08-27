"use client";

import { useState, useEffect } from "react";
import { formatCents } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { showError } from "@/lib/toast";

type PriceItem = {
  id: string;
  kind: string;
  label: string;
  fraction: number | null;
  amountCents: number;
  sortOrder: number;
  usageCount?: number;
};

type QuoteLine = {
  priceItemId: string;
  label: string;
  qty: number;
  unitCents: number;
};

export function QuoteBuilder({
  jobId,
  jobStatus,
  taxRateBps,
}: {
  jobId: string;
  jobStatus: string;
  taxRateBps: number;
}) {
  const [items, setItems] = useState<PriceItem[]>([]);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [discountCents, setDiscountCents] = useState(0);
  const [discountReason, setDiscountReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ quoteId: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Can only build quotes in ON_SITE, QUOTED, or DECLINED status
  const canQuote = ["ON_SITE", "QUOTED", "DECLINED"].includes(jobStatus);

  useEffect(() => {
    fetch("/api/org/pricebook")
      .then((res) => res.json())
      .then((data) => setItems(data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!canQuote) return null;

  const loadFractions = items.filter((i) => i.kind === "LOAD_FRACTION");
  const addons = items
    .filter((i) => i.kind === "ADDON" || i.kind === "FEE")
    .sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0) || a.sortOrder - b.sortOrder);

  const subtotalCents = lines.reduce((s, l) => s + l.qty * l.unitCents, 0);
  const taxableAmount = subtotalCents - discountCents;
  const taxCents = Math.round((taxableAmount * taxRateBps) / 10000);
  const totalCents = taxableAmount + taxCents;

  function selectLoadFraction(item: PriceItem) {
    // Replace any existing load fraction
    setLines((prev) => [
      ...prev.filter((l) => {
        const pi = items.find((i) => i.id === l.priceItemId);
        return pi?.kind !== "LOAD_FRACTION";
      }),
      { priceItemId: item.id, label: item.label, qty: 1, unitCents: item.amountCents },
    ]);
  }

  function toggleAddon(item: PriceItem) {
    setLines((prev) => {
      const exists = prev.find((l) => l.priceItemId === item.id);
      if (exists) return prev.filter((l) => l.priceItemId !== item.id);
      return [
        ...prev,
        { priceItemId: item.id, label: item.label, qty: 1, unitCents: item.amountCents },
      ];
    });
  }

  function updateAddonQty(priceItemId: string, qty: number) {
    setLines((prev) =>
      prev.map((l) => (l.priceItemId === priceItemId ? { ...l, qty: Math.max(1, qty) } : l))
    );
  }

  async function submitQuote() {
    if (lines.length === 0) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/org/jobs/${jobId}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines, discountCents, discountReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || "Failed to create quote");
      } else {
        setResult({ quoteId: data.quote.id });
      }
    } catch {
      showError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <p className="text-green-800 font-medium">Quote created</p>
          <p className="text-green-600 text-sm mt-1">Total: {formatCents(totalCents)}</p>
          <Button asChild className="mt-3 w-full h-12">
            <a href={`/m/jobs/${jobId}/present?quoteId=${result.quoteId}`}>
              Present to Customer
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-20" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </CardContent>
      </Card>
    );
  }

  // Selected load fraction
  const selectedLF = lines.find((l) => {
    const pi = items.find((i) => i.id === l.priceItemId);
    return pi?.kind === "LOAD_FRACTION";
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Build Quote</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Load Fraction Selection */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Truck Load</p>
          <div className="grid grid-cols-3 gap-2">
            {loadFractions.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant={selectedLF?.priceItemId === item.id ? "default" : "outline"}
                onClick={() => selectLoadFraction(item)}
                className="h-auto py-2 px-1 flex flex-col text-xs"
              >
                <span className="font-medium">{item.label.replace(" Truck Load", "").replace(" Load", "")}</span>
                <span className="text-[10px] mt-0.5 opacity-75">
                  {formatCents(item.amountCents)}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Add-ons */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Add-ons</p>
          <div className="space-y-2">
            {addons.map((item) => {
              const line = lines.find((l) => l.priceItemId === item.id);
              return (
                <div key={item.id} className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={line ? "secondary" : "outline"}
                    onClick={() => toggleAddon(item)}
                    className="flex-1 justify-start text-left text-sm h-10"
                  >
                    {item.label} — {formatCents(item.amountCents)}
                  </Button>
                  {line && (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => updateAddonQty(item.id, line.qty - 1)}
                        className="w-7 h-7 text-sm"
                      >
                        -
                      </Button>
                      <span className="w-6 text-center text-sm text-foreground">{line.qty}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => updateAddonQty(item.id, line.qty + 1)}
                        className="w-7 h-7 text-sm"
                      >
                        +
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Discount */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Discount</p>
          <div className="flex gap-2">
            <div className="w-28">
              <Input
                type="number"
                min="0"
                step="1"
                value={discountCents / 100 || ""}
                onChange={(e) => setDiscountCents(Math.round(Number(e.target.value) * 100))}
                placeholder="$0.00"
                className="text-sm"
              />
            </div>
            <Input
              type="text"
              value={discountReason}
              onChange={(e) => setDiscountReason(e.target.value)}
              placeholder="Reason (optional)"
              className="flex-1 text-sm"
            />
          </div>
        </div>

        {/* Totals */}
        {lines.length > 0 && (
          <div className="border-t border-border pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">{formatCents(subtotalCents)}</span>
            </div>
            {discountCents > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount</span>
                <span>-{formatCents(discountCents)}</span>
              </div>
            )}
            {taxCents > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({(taxRateBps / 100).toFixed(2)}%)</span>
                <span className="text-foreground">{formatCents(taxCents)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base text-foreground pt-1 border-t border-border">
              <span>Total</span>
              <span>{formatCents(totalCents)}</span>
            </div>
          </div>
        )}

        <Button
          type="button"
          onClick={submitQuote}
          disabled={lines.length === 0 || submitting}
          className="w-full h-12 font-medium"
        >
          {submitting ? "Creating..." : "Create Quote"}
        </Button>
      </CardContent>
    </Card>
  );
}
