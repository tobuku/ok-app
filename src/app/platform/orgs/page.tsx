"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Org = {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  stripeConnectAccountId: string | null;
  subscription: { plan: { name: string } } | null;
  _count: { users: number; jobs: number };
};

export default function OrgsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", adminEmail: "", adminName: "", timezone: "Pacific/Honolulu" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function loadOrgs() {
    setLoading(true);
    fetch("/api/platform/orgs")
      .then((r) => r.json())
      .then(setOrgs)
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadOrgs(); }, []);

  async function createOrg() {
    if (!form.name.trim() || !form.slug.trim() || !form.adminEmail.trim() || !form.adminName.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/platform/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error || "Failed");
      } else {
        setShowCreate(false);
        setForm({ name: "", slug: "", adminEmail: "", adminName: "", timezone: "Pacific/Honolulu" });
        setMessage("Organization created. Invite email sent.");
        loadOrgs();
        setTimeout(() => setMessage(null), 4000);
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(orgId: string, status: string) {
    const action = status === "SUSPENDED" ? "suspend" : "reactivate";
    if (!confirm(`Are you sure you want to ${action} this organization?`)) return;
    await fetch(`/api/platform/orgs/${orgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadOrgs();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Organizations</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          {showCreate ? "Cancel" : "Create Organization"}
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.includes("error") || message.includes("Failed")
            ? "bg-red-900/50 text-red-300"
            : "bg-green-900/50 text-green-300"
        }`}>
          {message}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6 space-y-3">
          <h2 className="text-sm font-medium text-gray-300">New Organization</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Company Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Slug *</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Admin Name *</label>
              <input
                type="text"
                value={form.adminName}
                onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Admin Email *</label>
              <input
                type="email"
                value={form.adminEmail}
                onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white"
              />
            </div>
          </div>
          <button
            onClick={createOrg}
            disabled={saving || !form.name.trim() || !form.slug.trim() || !form.adminEmail.trim() || !form.adminName.trim()}
            className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium disabled:bg-gray-600 hover:bg-blue-700"
          >
            {saving ? "Creating..." : "Create & Send Invite"}
          </button>
        </div>
      )}

      {/* Org list */}
      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-750">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Users</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Jobs</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {orgs.map((org) => (
                <tr key={org.id} className="hover:bg-gray-750">
                  <td className="px-4 py-3">
                    <Link href={`/platform/orgs/${org.id}`} className="text-sm font-medium text-blue-400 hover:text-blue-300">
                      {org.name}
                    </Link>
                    <p className="text-xs text-gray-500">{org.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={org.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {org.subscription?.plan?.name ?? "None"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400 text-right">{org._count.users}</td>
                  <td className="px-4 py-3 text-sm text-gray-400 text-right">{org._count.jobs}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    {org.status === "SUSPENDED" ? (
                      <button onClick={() => updateStatus(org.id, "ACTIVE")} className="text-xs text-green-400 hover:text-green-300">
                        Reactivate
                      </button>
                    ) : org.status !== "CANCELED" ? (
                      <button onClick={() => updateStatus(org.id, "SUSPENDED")} className="text-xs text-red-400 hover:text-red-300">
                        Suspend
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    TRIALING: "bg-blue-900 text-blue-300",
    ACTIVE: "bg-green-900 text-green-300",
    PAST_DUE: "bg-yellow-900 text-yellow-300",
    SUSPENDED: "bg-red-900 text-red-300",
    CANCELED: "bg-gray-700 text-gray-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || "bg-gray-700 text-gray-400"}`}>
      {status}
    </span>
  );
}
