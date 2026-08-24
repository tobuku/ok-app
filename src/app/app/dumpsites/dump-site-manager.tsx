"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DumpSite = {
  id: string;
  name: string;
  address: string | null;
  hours: string | null;
  acceptedMaterials: string | null;
  feeNotes: string | null;
  active: boolean;
};

export function DumpSiteManager({
  initialSites,
  isAdmin,
}: {
  initialSites: DumpSite[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [sites, setSites] = useState(initialSites);
  const [showInactive, setShowInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", hours: "", acceptedMaterials: "", feeNotes: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const filtered = showInactive ? sites : sites.filter((s) => s.active);

  async function addSite() {
    if (!form.name.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/org/dumpsites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error || "Failed to add dump site");
      } else {
        const site = await res.json();
        setSites((prev) => [...prev, site]);
        setForm({ name: "", address: "", hours: "", acceptedMaterials: "", feeNotes: "" });
        setShowForm(false);
        router.refresh();
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(site: DumpSite) {
    const res = await fetch(`/api/org/dumpsites/${site.id}`, {
      method: site.active ? "DELETE" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !site.active }),
    });
    if (res.ok) {
      setSites((prev) =>
        prev.map((s) => (s.id === site.id ? { ...s, active: !s.active } : s))
      );
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      {/* Add button / form */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Add Dump Site
        </button>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-medium text-gray-700">New Dump Site</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hours</label>
              <input
                type="text"
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })}
                placeholder="e.g. Mon-Sat 7am-4pm"
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Accepted Materials</label>
              <input
                type="text"
                value={form.acceptedMaterials}
                onChange={(e) => setForm({ ...form, acceptedMaterials: e.target.value })}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Fee Notes</label>
              <input
                type="text"
                value={form.feeNotes}
                onChange={(e) => setForm({ ...form, feeNotes: e.target.value })}
                placeholder="e.g. $45/ton, minimum $25"
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={addSite}
              disabled={saving || !form.name.trim()}
              className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium disabled:bg-gray-300 hover:bg-blue-700"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => { setShowForm(false); setMessage(null); }}
              className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            {message && <span className="text-sm text-red-600">{message}</span>}
          </div>
        </div>
      )}

      {/* Site list */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-700">
            {filtered.length} site{filtered.length !== 1 ? "s" : ""}
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
          <p className="px-4 py-6 text-sm text-gray-500 text-center">No dump sites yet.</p>
        ) : (
          <div className="divide-y divide-gray-200">
            {filtered.map((site) => (
              <div key={site.id} className={`px-4 py-3 ${!site.active ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{site.name}</p>
                    {site.address && <p className="text-xs text-gray-600 mt-0.5">{site.address}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                      {site.hours && <span>Hours: {site.hours}</span>}
                      {site.acceptedMaterials && <span>Materials: {site.acceptedMaterials}</span>}
                      {site.feeNotes && <span>Fees: {site.feeNotes}</span>}
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => toggleActive(site)}
                      className="text-xs text-blue-600 hover:text-blue-800 ml-4 shrink-0"
                    >
                      {site.active ? "Deactivate" : "Reactivate"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
