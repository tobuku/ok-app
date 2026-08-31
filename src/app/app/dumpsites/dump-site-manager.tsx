"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showSuccess, showError } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, X, Check } from "lucide-react";

type DumpSite = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  hours: string | null;
  weekendHours: string | null;
  acceptedMaterials: string | null;
  feeNotes: string | null;
  active: boolean;
};

type SiteForm = {
  name: string;
  address: string;
  phone: string;
  hours: string;
  weekendHours: string;
  acceptedMaterials: string;
  feeNotes: string;
};

const emptyForm: SiteForm = { name: "", address: "", phone: "", hours: "", weekendHours: "", acceptedMaterials: "", feeNotes: "" };

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
  const [form, setForm] = useState<SiteForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SiteForm>(emptyForm);
  const [editSaving, setEditSaving] = useState(false);

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
        setForm(emptyForm);
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

  function startEdit(site: DumpSite) {
    setEditingId(site.id);
    setEditForm({
      name: site.name,
      address: site.address ?? "",
      phone: site.phone ?? "",
      hours: site.hours ?? "",
      weekendHours: site.weekendHours ?? "",
      acceptedMaterials: site.acceptedMaterials ?? "",
      feeNotes: site.feeNotes ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyForm);
  }

  async function saveEdit(siteId: string) {
    if (!editForm.name.trim()) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/org/dumpsites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const updated = await res.json();
        setSites((prev) => prev.map((s) => (s.id === siteId ? updated : s)));
        setEditingId(null);
        showSuccess("Dump site updated");
        router.refresh();
      } else {
        showError("Failed to update site");
      }
    } catch {
      showError("Network error");
    } finally {
      setEditSaving(false);
    }
  }

  function renderFormFields(values: SiteForm, onChange: (v: SiteForm) => void) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Name *</Label>
          <Input
            type="text"
            value={values.name}
            onChange={(e) => onChange({ ...values, name: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Address</Label>
          <Input
            type="text"
            value={values.address}
            onChange={(e) => onChange({ ...values, address: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Phone</Label>
          <Input
            type="tel"
            value={values.phone}
            onChange={(e) => onChange({ ...values, phone: e.target.value })}
            placeholder="e.g. (808) 555-1234"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Accepted Materials</Label>
          <Input
            type="text"
            value={values.acceptedMaterials}
            onChange={(e) => onChange({ ...values, acceptedMaterials: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Weekday Hours</Label>
          <Input
            type="text"
            value={values.hours}
            onChange={(e) => onChange({ ...values, hours: e.target.value })}
            placeholder="e.g. Mon-Fri 7am-4pm"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Weekend Hours</Label>
          <Input
            type="text"
            value={values.weekendHours}
            onChange={(e) => onChange({ ...values, weekendHours: e.target.value })}
            placeholder="e.g. Sat 8am-12pm, Sun Closed"
            className="mt-1"
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs text-muted-foreground">Fee Notes</Label>
          <Input
            type="text"
            value={values.feeNotes}
            onChange={(e) => onChange({ ...values, feeNotes: e.target.value })}
            placeholder="e.g. $45/ton, minimum $25"
            className="mt-1"
          />
        </div>
      </div>
    );
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
            {renderFormFields(form, setForm)}
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
            {filtered.map((site) =>
              editingId === site.id ? (
                <div key={site.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">Edit Dump Site</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => saveEdit(site.id)}
                        disabled={editSaving || !editForm.name.trim()}
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
                  </div>
                  {renderFormFields(editForm, setEditForm)}
                </div>
              ) : (
                <div key={site.id} className={`px-4 py-3 ${!site.active ? "opacity-50" : ""}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{site.name}</p>
                      {site.address && <p className="text-xs text-muted-foreground mt-0.5">{site.address}</p>}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                        {site.phone && <span>Phone: {site.phone}</span>}
                        {site.hours && <span>Hours: {site.hours}</span>}
                        {site.weekendHours && <span>Weekend: {site.weekendHours}</span>}
                        {site.acceptedMaterials && <span>Materials: {site.acceptedMaterials}</span>}
                        {site.feeNotes && <span>Fees: {site.feeNotes}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => startEdit(site)}
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => toggleActive(site)}
                          className="text-xs h-auto p-0"
                        >
                          {site.active ? "Deactivate" : "Reactivate"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
