"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showSuccess, showError } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  const filtered = showInactive ? sites : sites.filter((s) => s.active);

  async function addSite() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/org/dumpsites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        showError(data.error || "Failed to add dump site");
      } else {
        const site = await res.json();
        setSites((prev) => [...prev, site]);
        setForm({ name: "", address: "", hours: "", acceptedMaterials: "", feeNotes: "" });
        setShowForm(false);
        showSuccess("Dump site added");
        router.refresh();
      }
    } catch {
      showError("Network error");
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
      showSuccess(site.active ? "Site deactivated" : "Site reactivated");
      router.refresh();
    } else {
      showError("Failed to update site");
    }
  }

  return (
    <div className="space-y-4">
      {/* Add button / form */}
      {!showForm ? (
        <Button onClick={() => setShowForm(true)}>
          Add Dump Site
        </Button>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">New Dump Site</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Name *</Label>
                <Input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Address</Label>
                <Input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Hours</Label>
                <Input
                  type="text"
                  value={form.hours}
                  onChange={(e) => setForm({ ...form, hours: e.target.value })}
                  placeholder="e.g. Mon-Sat 7am-4pm"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Accepted Materials</Label>
                <Input
                  type="text"
                  value={form.acceptedMaterials}
                  onChange={(e) => setForm({ ...form, acceptedMaterials: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Fee Notes</Label>
                <Input
                  type="text"
                  value={form.feeNotes}
                  onChange={(e) => setForm({ ...form, feeNotes: e.target.value })}
                  placeholder="e.g. $45/ton, minimum $25"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={addSite}
                disabled={saving || !form.name.trim()}
                size="sm"
              >
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Site list */}
      <Card>
        <div className="flex items-center justify-between px-4 py-3 bg-muted border-b border-border">
          <span className="text-sm font-medium text-foreground">
            {filtered.length} site{filtered.length !== 1 ? "s" : ""}
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
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">No dump sites yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((site) => (
              <div key={site.id} className={`px-4 py-3 ${!site.active ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{site.name}</p>
                    {site.address && <p className="text-xs text-muted-foreground mt-0.5">{site.address}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                      {site.hours && <span>Hours: {site.hours}</span>}
                      {site.acceptedMaterials && <span>Materials: {site.acceptedMaterials}</span>}
                      {site.feeNotes && <span>Fees: {site.feeNotes}</span>}
                    </div>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => toggleActive(site)}
                      className="text-xs h-auto p-0 ml-4 shrink-0"
                    >
                      {site.active ? "Deactivate" : "Reactivate"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
