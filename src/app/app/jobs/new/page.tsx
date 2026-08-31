"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";

type Customer = { id: string; name: string; phone: string | null; addresses: { id: string; line1: string; city: string; state: string; zip: string }[] };
type User = { id: string; name: string; role: string };

export default function NewJobPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leadmen, setLeadmen] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill from query params (Repeat Customer Quick-Book #5)
  const [customerId, setCustomerId] = useState(searchParams.get("customerId") ?? "");
  const [addressId, setAddressId] = useState(searchParams.get("addressId") ?? "");
  const [scheduledDate, setScheduledDate] = useState("");
  const [assignedToId, setAssignedToId] = useState(searchParams.get("assignedToId") ?? "");
  const [notes, setNotes] = useState(searchParams.get("notes") ?? "");
  const [source, setSource] = useState(searchParams.get("source") ?? "PHONE");

  useEffect(() => {
    Promise.all([
      fetch("/api/org/customers").then((r) => r.json()),
      fetch("/api/org/users").then((r) => r.json()),
    ]).then(([custs, users]) => {
      setCustomers(custs);
      setLeadmen(users.filter((u: User) => u.role === "LEADMAN"));
      setLoading(false);
    });
  }, []);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) {
      setError("Select a customer");
      return;
    }
    setError("");
    setSaving(true);

    const res = await fetch("/api/org/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        addressId: addressId || null,
        scheduledDate: scheduledDate || null,
        assignedToId: assignedToId || null,
        notes: notes || null,
        source,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create job");
      setSaving(false);
      return;
    }

    const job = await res.json();
    router.push(`/app/jobs/${job.id}`);
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="max-w-xl">
      <Link href="/app" className="text-sm text-primary hover:underline mb-4 inline-flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" />
        Back to board
      </Link>

      <h1 className="text-2xl font-bold mb-6">New Job</h1>

      {customers.length === 0 && (
        <div className="mb-4 p-4 bg-accent rounded-md text-sm">
          No customers yet.{" "}
          <Link href="/app/customers/new" className="text-primary underline">
            Create one first
          </Link>
        </div>
      )}

      <Card>
        <CardContent className="pt-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="mb-1">Customer *</Label>
              <select
                value={customerId}
                onChange={(e) => { setCustomerId(e.target.value); setAddressId(""); }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.phone ? ` (${c.phone})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {selectedCustomer && selectedCustomer.addresses.length > 0 && (
              <div>
                <Label className="mb-1">Service Address</Label>
                <select
                  value={addressId}
                  onChange={(e) => setAddressId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select address...</option>
                  {selectedCustomer.addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.line1}, {a.city}, {a.state} {a.zip}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Label className="mb-1">Scheduled Date</Label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <Label className="mb-1">Assign Leadman</Label>
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Unassigned</option>
                {leadmen.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="mb-1">Source</Label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="PHONE">Phone</option>
                <option value="REFERRAL">Referral</option>
                <option value="REPEAT">Repeat</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <Label className="mb-1">Notes</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Items to remove, access instructions, etc."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Job"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
