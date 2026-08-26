"use client";

import { useState } from "react";
import { formatCents } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { showSuccess, showError } from "@/lib/toast";

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

  const loadFractions = items.filter((i) => i.kind === "LOAD_FRACTION");
  const addons = items.filter((i) => i.kind === "ADDON" || i.kind === "FEE");

  function updateItem(id: string, field: string, value: string | number | boolean) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/org/pricebook", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceBookId, items }),
      });
      if (!res.ok) {
        const data = await res.json();
        showError(data.error || "Save failed");
      } else {
        showSuccess("Saved");
      }
    } catch {
      showError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Price book: <span className="font-medium text-foreground">{priceBookName}</span>
      </p>

      {/* Load Fractions */}
      <Card>
        <CardHeader>
          <CardTitle>Truck Load Fractions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-center">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadFractions.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.label}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={(item.amountCents / 100).toFixed(2)}
                      onChange={(e) =>
                        updateItem(item.id, "amountCents", Math.round(Number(e.target.value) * 100))
                      }
                      className="w-24 text-right ml-auto"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <input
                      type="checkbox"
                      checked={item.active}
                      onChange={(e) => updateItem(item.id, "active", e.target.checked)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add-ons */}
      <Card>
        <CardHeader>
          <CardTitle>Add-ons &amp; Fees</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-center">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {addons.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Input
                      type="text"
                      value={item.label}
                      onChange={(e) => updateItem(item.id, "label", e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={(item.amountCents / 100).toFixed(2)}
                      onChange={(e) =>
                        updateItem(item.id, "amountCents", Math.round(Number(e.target.value) * 100))
                      }
                      className="w-24 text-right ml-auto"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <input
                      type="checkbox"
                      checked={item.active}
                      onChange={(e) => updateItem(item.id, "active", e.target.checked)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Price Preview (active items)</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
