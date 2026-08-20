"use client";

import { useState, useEffect } from "react";
import { formatCents } from "@/lib/format";

type PriceItem = {
  id: string;
  kind: string;
  label: string;
  fraction: number | null;
  amountCents: number;
  sortOrder: number;
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
  const [error, setError] = useState<string | null>(null);
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
  const addons = items.filter((i) => i.kind === "ADDON" || i.kind === "FEE");

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
    setError(null);

    try {
      const res = await fetch(`/api/org/jobs/${jobId}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines, discountCents, discountReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create quote");
      } else {
        setResult({ quoteId: data.quote.id });
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-green-800 font-medium">Quote created</p>
        <p className="text-green-600 text-sm mt-1">Total: {formatCents(totalCents)}</p>
        <a
          href={`/m/jobs/${jobId}/present?quoteId=${result.quoteId}`}
          className="mt-3 block w-full text-center bg-blue-600 text-white py-3 rounded-lg font-medium"
        >
          Present to Customer
        </a>
      </div>
    );
  }

  if (loading) return <p className="text-xs text-gray-400">Loading price book...</p>;

  // Selected load fraction
  const selectedLF = lines.find((l) => {
    const pi = items.find((i) => i.id === l.priceItemId);
    return pi?.kind === "LOAD_FRACTION";
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <h3 className="font-bold text-base">Build Quote</h3>

      {/* Load Fraction Selection */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase mb-2">Truck Load</p>
        <div className="grid grid-cols-3 gap-2">
          {loadFractions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectLoadFraction(item)}
              className={`text-xs py-2 px-1 rounded border text-center
                ${selectedLF?.priceItemId === item.id
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"}`}
            >
              <span className="block font-medium">{item.label.replace(" Truck Load", "").replace(" Load", "")}</span>
              <span className="block text-[10px] mt-0.5 opacity-75">
                {formatCents(item.amountCents)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Add-ons */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase mb-2">Add-ons</p>
        <div className="space-y-2">
          {addons.map((item) => {
            const line = lines.find((l) => l.priceItemId === item.id);
            return (
              <div key={item.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleAddon(item)}
                  className={`flex-1 text-left text-sm py-2 px-3 rounded border
                    ${line
                      ? "bg-blue-50 border-blue-300 text-blue-800"
                      : "bg-white border-gray-200 text-gray-700"}`}
                >
                  {item.label} — {formatCents(item.amountCents)}
                </button>
                {line && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateAddonQty(item.id, line.qty - 1)}
                      className="w-7 h-7 rounded bg-gray-100 text-gray-600 text-sm"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-sm">{line.qty}</span>
                    <button
                      type="button"
                      onClick={() => updateAddonQty(item.id, line.qty + 1)}
                      className="w-7 h-7 rounded bg-gray-100 text-gray-600 text-sm"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Discount */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase mb-2">Discount</p>
        <div className="flex gap-2">
          <div className="w-28">
            <input
              type="number"
              min="0"
              step="1"
              value={discountCents / 100 || ""}
              onChange={(e) => setDiscountCents(Math.round(Number(e.target.value) * 100))}
              placeholder="$0.00"
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
            />
          </div>
          <input
            type="text"
            value={discountReason}
            onChange={(e) => setDiscountReason(e.target.value)}
            placeholder="Reason (optional)"
            className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      {/* Totals */}
      {lines.length > 0 && (
        <div className="border-t border-gray-100 pt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-gray-900">{formatCents(subtotalCents)}</span>
          </div>
          {discountCents > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount</span>
              <span>-{formatCents(discountCents)}</span>
            </div>
          )}
          {taxCents > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Tax ({(taxRateBps / 100).toFixed(2)}%)</span>
              <span className="text-gray-900">{formatCents(taxCents)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base text-gray-900 pt-1 border-t border-gray-100">
            <span>Total</span>
            <span>{formatCents(totalCents)}</span>
          </div>
        </div>
      )}

      {error && <p className="text-red-600 text-xs">{error}</p>}

      <button
        type="button"
        onClick={submitQuote}
        disabled={lines.length === 0 || submitting}
        className="w-full py-3 rounded-lg font-medium text-white bg-blue-600 disabled:bg-gray-300"
      >
        {submitting ? "Creating..." : "Create Quote"}
      </button>
    </div>
  );
}
