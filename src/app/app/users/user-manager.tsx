"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  active: boolean;
  invitedAt: string | null;
  createdAt: string;
};

const ROLES = ["LEADMAN", "DISPATCHER", "ORG_ADMIN"] as const;

export function UserManager({
  initialUsers,
  currentUserId,
}: {
  initialUsers: User[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "LEADMAN" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function inviteUser() {
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/org/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error || "Failed to invite user");
      } else {
        setShowForm(false);
        setForm({ name: "", email: "", phone: "", role: "LEADMAN" });
        router.refresh();
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function updateUser(userId: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/org/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) router.refresh();
  }

  async function toggleActive(u: User) {
    if (u.id === currentUserId) return;
    const action = u.active ? "deactivate" : "reactivate";
    if (!confirm(`Are you sure you want to ${action} ${u.name}?`)) return;
    await updateUser(u.id, { active: !u.active });
  }

  return (
    <div className="space-y-4">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Add Team Member
        </button>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-medium text-gray-700">New Team Member</h2>
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
              <label className="block text-xs text-gray-500 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Role *</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r.replace("_", " ")}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={inviteUser}
              disabled={saving || !form.name.trim() || !form.email.trim()}
              className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium disabled:bg-gray-300 hover:bg-blue-700"
            >
              {saving ? "Adding..." : "Add Member"}
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

      {/* User table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {initialUsers.map((u) => (
              <tr key={u.id} className={!u.active ? "opacity-50" : ""}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {u.name}
                  {u.id === currentUserId && (
                    <span className="ml-2 text-xs text-gray-400">(you)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{u.phone || "-"}</td>
                <td className="px-4 py-3 text-sm">
                  {u.id === currentUserId ? (
                    <span className="text-gray-600">{u.role.replace("_", " ")}</span>
                  ) : (
                    <select
                      value={u.role}
                      onChange={(e) => updateUser(u.id, { role: e.target.value })}
                      className="border border-gray-200 rounded px-2 py-0.5 text-sm"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r.replace("_", " ")}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    u.active
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}>
                    {u.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  {u.id !== currentUserId && (
                    <button
                      onClick={() => toggleActive(u)}
                      className={`text-xs ${
                        u.active
                          ? "text-red-600 hover:text-red-800"
                          : "text-blue-600 hover:text-blue-800"
                      }`}
                    >
                      {u.active ? "Deactivate" : "Reactivate"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
