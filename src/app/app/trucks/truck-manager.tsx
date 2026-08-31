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
import { Pencil, X, Check } from "lucide-react";

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [editSaving, setEditSaving] = useState(false);

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

  function startEdit(truck: Truck) {
    setEditingId(truck.id);
    setEditName(truck.name);
    setEditCapacity(truck.capacityCubicYards?.toString() ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditCapacity("");
  }

  async function saveEdit(truckId: string) {
    if (!editName.trim()) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/org/trucks/${truckId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          capacityCubicYards: editCapacity ? parseFloat(editCapacity) : null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTrucks((prev) =>
          prev.map((t) => (t.id === truckId ? { ...t, name: updated.name, capacityCubicYards: updated.capacityCubicYards } : t))
        );
        setEditingId(null);
        showSuccess("Truck updated");
        router.refresh();
      } else {
        showError("Failed to update truck");
      }
    } catch {
      showError("Network error");
    } finally {
      setEditSaving(false);
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
                <TableHead className="px-4 text-xs uppercase text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((truck) => (
                <TableRow key={truck.id} className={!truck.active ? "opacity-50" : ""}>
                  {editingId === truck.id ? (
                    <>
                      <TableCell className="px-4 py-2">
                        <Input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <Input
                          type="number"
                          step="0.1"
                          value={editCapacity}
                          onChange={(e) => setEditCapacity(e.target.value)}
                          placeholder="Optional"
                          className="h-8 text-sm w-28"
                        />
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <Badge variant={truck.active ? "success" : "secondary"}>
                          {truck.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => saveEdit(truck.id)}
                            disabled={editSaving || !editName.trim()}
                          >
                            <Check className="h-4 w-4 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={cancelEdit}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="px-4 py-3 font-medium text-foreground">{truck.name}</TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground">
                        {truck.capacityCubicYards ? `${truck.capacityCubicYards} cu yd` : "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge variant={truck.active ? "success" : "secondary"}>
                          {truck.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => startEdit(truck)}
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => toggleActive(truck)}
                              className="text-xs h-auto p-0"
                            >
                              {truck.active ? "Deactivate" : "Reactivate"}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </>
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
