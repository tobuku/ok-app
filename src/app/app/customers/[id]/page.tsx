"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Pencil, Trash2, Save, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Address = {
  id: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  zip: string;
  lat: number | null;
  lng: number | null;
};

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  addresses: Address[];
};

type JobSummary = {
  id: string;
  jobNumber: number;
  status: string;
  scheduledDate: string | null;
  customer: { name: string };
};

type AuditEntry = {
  id: string;
  action: string;
  entity: string;
  meta: { before?: Record<string, unknown>; after?: Record<string, unknown> };
  actorName: string;
  createdAt: string;
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [history, setHistory] = useState<AuditEntry[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Customer edit state
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [saving, setSaving] = useState(false);

  // Address edit state
  const [editingAddr, setEditingAddr] = useState<string | null>(null);
  const [addrForm, setAddrForm] = useState({ line1: "", line2: "", city: "", state: "", zip: "" });
  const [addingAddr, setAddingAddr] = useState(false);
  const [newAddr, setNewAddr] = useState({ line1: "", line2: "", city: "", state: "", zip: "" });
  const [addrSaving, setAddrSaving] = useState(false);

  const fetchCustomer = useCallback(async () => {
    const res = await fetch(`/api/org/customers/${id}`);
    if (!res.ok) {
      toast.error("Customer not found");
      router.push("/app/customers");
      return;
    }
    const data = await res.json();
    setCustomer(data);
    setForm({
      name: data.name,
      phone: data.phone || "",
      email: data.email || "",
      notes: data.notes || "",
    });
  }, [id, router]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await fetchCustomer();

      // Fetch jobs for this customer
      const jobsRes = await fetch(`/api/org/jobs?customerId=${id}`);
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setJobs(Array.isArray(jobsData) ? jobsData : jobsData.jobs || []);
      }

      // Try fetching audit history (only succeeds for ORG_ADMIN)
      const histRes = await fetch(`/api/org/customers/${id}/history`);
      if (histRes.ok) {
        setHistory(await histRes.json());
        setIsAdmin(true);
      }

      setLoading(false);
    }
    load();
  }, [id, fetchCustomer]);

  async function saveCustomer() {
    setSaving(true);
    const res = await fetch(`/api/org/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success("Customer updated");
      await fetchCustomer();
      setEditing(false);
      // Refresh history
      const histRes = await fetch(`/api/org/customers/${id}/history`);
      if (histRes.ok) setHistory(await histRes.json());
    } else {
      toast.error("Failed to update customer");
    }
    setSaving(false);
  }

  async function saveAddress() {
    if (!editingAddr) return;
    setAddrSaving(true);
    const res = await fetch(`/api/org/customers/${id}/addresses`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addressId: editingAddr, ...addrForm }),
    });
    if (res.ok) {
      toast.success("Address updated");
      await fetchCustomer();
      setEditingAddr(null);
    } else {
      toast.error("Failed to update address");
    }
    setAddrSaving(false);
  }

  async function addAddress() {
    if (!newAddr.line1 || !newAddr.city || !newAddr.state || !newAddr.zip) {
      toast.error("Fill in line1, city, state, and zip");
      return;
    }
    setAddrSaving(true);
    const res = await fetch(`/api/org/customers/${id}/addresses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAddr),
    });
    if (res.ok) {
      toast.success("Address added");
      await fetchCustomer();
      setAddingAddr(false);
      setNewAddr({ line1: "", line2: "", city: "", state: "", zip: "" });
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to add address");
    }
    setAddrSaving(false);
  }

  async function deleteAddress(addressId: string) {
    if (!confirm("Delete this address?")) return;
    const res = await fetch(`/api/org/customers/${id}/addresses?addressId=${addressId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Address deleted");
      await fetchCustomer();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to delete address");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/app/customers"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">{customer.name}</h1>
      </div>

      {/* Customer Info */}
      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Customer Info</h2>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={saveCustomer} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setForm({ name: customer.name, phone: customer.phone || "", email: customer.email || "", notes: customer.notes || "" }); }}>
                <X className="h-3.5 w-3.5 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Phone</dt>
            <dd>{customer.phone || "-"}</dd>
            <dt className="text-muted-foreground">Email</dt>
            <dd>{customer.email || "-"}</dd>
            <dt className="text-muted-foreground">Notes</dt>
            <dd>{customer.notes || "-"}</dd>
          </dl>
        )}
      </Card>

      {/* Addresses */}
      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Addresses</h2>
          {!addingAddr && (
            <Button variant="outline" size="sm" onClick={() => setAddingAddr(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Address
            </Button>
          )}
        </div>

        {customer.addresses.length === 0 && !addingAddr && (
          <p className="text-sm text-muted-foreground">No addresses on file.</p>
        )}

        <div className="space-y-3">
          {customer.addresses.map((addr) =>
            editingAddr === addr.id ? (
              <div key={addr.id} className="border border-border rounded-lg p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <Label>Street</Label>
                    <Input value={addrForm.line1} onChange={(e) => setAddrForm({ ...addrForm, line1: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label>Line 2</Label>
                    <Input value={addrForm.line2} onChange={(e) => setAddrForm({ ...addrForm, line2: e.target.value })} />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>State</Label>
                      <Input value={addrForm.state} onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })} />
                    </div>
                    <div>
                      <Label>Zip</Label>
                      <Input value={addrForm.zip} onChange={(e) => setAddrForm({ ...addrForm, zip: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveAddress} disabled={addrSaving}>
                    {addrSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                    Save
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingAddr(null)}>
                    <X className="h-3.5 w-3.5 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div key={addr.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                <div className="text-sm">
                  <p>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
                  <p className="text-muted-foreground">{addr.city}, {addr.state} {addr.zip}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                    setEditingAddr(addr.id);
                    setAddrForm({ line1: addr.line1, line2: addr.line2 || "", city: addr.city, state: addr.state, zip: addr.zip });
                  }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteAddress(addr.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )
          )}

          {addingAddr && (
            <div className="border border-border rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Label>Street</Label>
                  <Input value={newAddr.line1} onChange={(e) => setNewAddr({ ...newAddr, line1: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Line 2</Label>
                  <Input value={newAddr.line2} onChange={(e) => setNewAddr({ ...newAddr, line2: e.target.value })} />
                </div>
                <div>
                  <Label>City</Label>
                  <Input value={newAddr.city} onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>State</Label>
                    <Input value={newAddr.state} onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })} />
                  </div>
                  <div>
                    <Label>Zip</Label>
                    <Input value={newAddr.zip} onChange={(e) => setNewAddr({ ...newAddr, zip: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addAddress} disabled={addrSaving}>
                  {addrSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                  Add
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setAddingAddr(false)}>
                  <X className="h-3.5 w-3.5 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Job History */}
      <Card className="p-5 mb-6">
        <h2 className="text-lg font-semibold mb-4">Job History</h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No jobs for this customer.</p>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <Link key={job.id} href={`/app/jobs/${job.id}`} className="block">
                <div className="flex items-center justify-between border border-border rounded-lg p-3 hover:bg-accent/50 transition-colors">
                  <div className="text-sm">
                    <span className="font-mono text-muted-foreground">#{job.jobNumber}</span>
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-muted">{job.status}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString() : "Unscheduled"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Change History (Admin only) */}
      {isAdmin && (
        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">Change History</h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No changes recorded.</p>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <div key={entry.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      <span className="font-medium">{entry.actorName}</span>
                      <span className="text-muted-foreground ml-1">
                        {entry.action.toLowerCase()}d {entry.entity}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {entry.meta?.before && entry.meta?.after && (
                    <div className="mt-1 text-xs space-y-0.5">
                      {Object.keys(entry.meta.after).map((key) => (
                        <div key={key} className="flex gap-2">
                          <span className="text-muted-foreground w-16">{key}:</span>
                          <span className="line-through text-destructive/70">{String(entry.meta.before?.[key] ?? "-")}</span>
                          <span className="text-primary">{String(entry.meta.after?.[key] ?? "-")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
