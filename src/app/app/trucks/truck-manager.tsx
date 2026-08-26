"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showSuccess, showError } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Truck = {
  id: string;
  name: string;
  capacityCubicYards: number | null;
  active: boolean;
};

export function TruckManager({
  initialTrucks,
  isAdmin,
}: {
  initialTrucks: Truck[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [trucks, setTrucks] = useState(initialTrucks);
  const [showInactive, setShowInactive] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCapacity, setNewCapacity] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = showInactive ? trucks : trucks.filter((t) => t.active);

  async function addTruck() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/org/trucks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          capacityCubicYards: newCapacity ? parseFloat(newCapacity) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        showError(data.error || "Failed to add truck");
      } else {
        const truck = await res.json();
        setTrucks((prev) => [...prev, truck]);
        setNewName("");
        setNewCapacity("");
        showSuccess("Truck added");
        router.refresh();
      }
    } catch {
      showError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(truck: Truck) {
    const res = await fetch(`/api/org/trucks/${truck.id}`, {
      method: truck.active ? "DELETE" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !truck.active }),
    });
    if (res.ok) {
      setTrucks((prev) =>
        prev.map((t) => (t.id === truck.id ? { ...t, active: !t.active } : t))
      );
      showSuccess(truck.active ? "Truck deactivated" : "Truck reactivated");
      router.refresh();
    } else {
      showError("Failed to update truck");
    }
  }

  return (
    <div className="space-y-4">
      {/* Add truck form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Add Truck</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Truck 1"
                className="w-48 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Capacity (cu yd)</Label>
              <Input
                type="number"
                step="0.1"
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
                placeholder="Optional"
                className="w-32 mt-1"
              />
            </div>
            <Button
              onClick={addTruck}
              disabled={saving || !newName.trim()}
              size="sm"
            >
              {saving ? "Adding..." : "Add"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Truck list */}
      <Card>
        <div className="flex items-center justify-between px-4 py-3 bg-muted border-b border-border">
          <span className="text-sm font-medium text-foreground">
            {filtered.length} truck{filtered.length !== 1 ? "s" : ""}
          </span>
          {isAdmin && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Show inactive
            </label>
          )}
        </div>
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">No trucks yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4 text-xs uppercase">Name</TableHead>
                <TableHead className="px-4 text-xs uppercase">Capacity</TableHead>
                <TableHead className="px-4 text-xs uppercase">Status</TableHead>
                {isAdmin && (
                  <TableHead className="px-4 text-xs uppercase text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((truck) => (
                <TableRow key={truck.id} className={!truck.active ? "opacity-50" : ""}>
                  <TableCell className="px-4 py-3 font-medium text-foreground">{truck.name}</TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">
                    {truck.capacityCubicYards ? `${truck.capacityCubicYards} cu yd` : "-"}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge variant={truck.active ? "success" : "secondary"}>
                      {truck.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="px-4 py-3 text-right">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => toggleActive(truck)}
                        className="text-xs h-auto p-0"
                      >
                        {truck.active ? "Deactivate" : "Reactivate"}
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
