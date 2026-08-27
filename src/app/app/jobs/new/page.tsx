"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

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

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="max-w-xl">
      <Link href="/app" className="text-sm text-blue-600 hover:underline mb-4 block">
        Back to board
      </Link>

      <h1 className="text-2xl font-bold mb-6">New Job</h1>

      {customers.length === 0 && (
        <div className="mb-4 p-4 bg-yellow-50 rounded-md text-sm">
          No customers yet.{" "}
          <Link href="/app/customers/new" className="text-blue-600 underline">
            Create one first
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
          <select
            value={customerId}
            onChange={(e) => { setCustomerId(e.target.value); setAddressId(""); }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Address</label>
            <select
              value={addressId}
              onChange={(e) => setAddressId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assign Leadman</label>
          <select
            value={assignedToId}
            onChange={(e) => setAssignedToId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Unassigned</option>
            {leadmen.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="PHONE">Phone</option>
            <option value="REFERRAL">Referral</option>
            <option value="REPEAT">Repeat</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Items to remove, access instructions, etc."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Creating..." : "Create Job"}
        </button>
      </form>
    </div>
  );
}
