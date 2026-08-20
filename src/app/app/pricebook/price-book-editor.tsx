"use client";

import { useState } from "react";
import { formatCents } from "@/lib/format";

type PriceItem = {
  id: string;
  kind: string;
  label: string;
  fraction: number | null;
  amountCents: number;
  sortOrder: number;
  active: boolean;
};

export function PriceBookEditor({
  priceBookId,
  priceBookName,
  initialItems,
}: {
  priceBookId: string;
  priceBookName: string;
  initialItems: PriceItem[];
}) {
  const [items, setItems] = useState<PriceItem[]>(initialItems);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadFractions = items.filter((i) => i.kind === "LOAD_FRACTION");
  const addons = items.filter((i) => i.kind === "ADDON" || i.kind === "FEE");

  function updateItem(id: string, field: string, value: string | number | boolean) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/org/pricebook", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceBookId, items }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error || "Save failed");
      } else {
        setMessage("Saved");
        setTimeout(() => setMessage(null), 2000);
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Price book: <span className="font-medium text-gray-700">{priceBookName}</span>
      </p>

      {/* Load Fractions */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Truck Load Fractions</h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Label</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Price</th>
                <th className="text-center px-4 py-2 font-medium text-gray-500">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadFractions.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2">{item.label}</td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={(item.amountCents / 100).toFixed(2)}
                      onChange={(e) =>
                        updateItem(item.id, "amountCents", Math.round(Number(e.target.value) * 100))
                      }
                      className="w-24 text-right border border-gray-200 rounded px-2 py-1"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={item.active}
                      onChange={(e) => updateItem(item.id, "active", e.target.checked)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add-ons */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Add-ons & Fees</h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Label</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Price</th>
                <th className="text-center px-4 py-2 font-medium text-gray-500">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {addons.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => updateItem(item.id, "label", e.target.value)}
                      className="w-full border border-gray-200 rounded px-2 py-1"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={(item.amountCents / 100).toFixed(2)}
                      onChange={(e) =>
                        updateItem(item.id, "amountCents", Math.round(Number(e.target.value) * 100))
                      }
                      className="w-24 text-right border border-gray-200 rounded px-2 py-1"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={item.active}
                      onChange={(e) => updateItem(item.id, "active", e.target.checked)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Price Preview (active items)</h3>
        <div className="space-y-1 text-sm">
          {items
            .filter((i) => i.active)
            .map((i) => (
              <div key={i.id} className="flex justify-between">
                <span>{i.label}</span>
                <span className="font-medium">{formatCents(i.amountCents)}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:bg-gray-300"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        {message && (
          <span
            className={`text-sm ${message === "Saved" ? "text-green-600" : "text-red-600"}`}
          >
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
