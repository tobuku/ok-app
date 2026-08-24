"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const [message, setMessage] = useState<string | null>(null);

  const filtered = showInactive ? trucks : trucks.filter((t) => t.active);

  async function addTruck() {
    if (!newName.trim()) return;
    setSaving(true);
    setMessage(null);
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
        setMessage(data.error || "Failed to add truck");
      } else {
        const truck = await res.json();
        setTrucks((prev) => [...prev, truck]);
        setNewName("");
        setNewCapacity("");
        router.refresh();
      }
    } catch {
      setMessage("Network error");
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
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      {/* Add truck form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Add Truck</h2>
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Truck 1"
              className="border border-gray-200 rounded px-3 py-1.5 text-sm w-48"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Capacity (cu yd)</label>
            <input
              type="number"
              step="0.1"
              value={newCapacity}
              onChange={(e) => setNewCapacity(e.target.value)}
              placeholder="Optional"
              className="border border-gray-200 rounded px-3 py-1.5 text-sm w-32"
            />
          </div>
          <button
            onClick={addTruck}
            disabled={saving || !newName.trim()}
            className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium disabled:bg-gray-300 hover:bg-blue-700"
          >
            {saving ? "Adding..." : "Add"}
          </button>
        </div>
        {message && <p className="text-sm text-red-600 mt-2">{message}</p>}
      </div>

      {/* Truck list */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-700">
            {filtered.length} truck{filtered.length !== 1 ? "s" : ""}
          </span>
          {isAdmin && (
            <label className="flex items-center gap-2 text-xs text-gray-500">
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
          <p className="px-4 py-6 text-sm text-gray-500 text-center">No trucks yet.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Capacity</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                {isAdmin && (
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((truck) => (
                <tr key={truck.id} className={!truck.active ? "opacity-50" : ""}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{truck.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {truck.capacityCubicYards ? `${truck.capacityCubicYards} cu yd` : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      truck.active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {truck.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-sm text-right">
                      <button
                        onClick={() => toggleActive(truck)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        {truck.active ? "Deactivate" : "Reactivate"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
