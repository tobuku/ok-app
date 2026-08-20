"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function JobEditForm({
  jobId,
  currentAssignedToId,
  currentScheduledDate,
  currentNotes,
  leadmen,
}: {
  jobId: string;
  currentAssignedToId: string | null;
  currentScheduledDate: string | null;
  currentNotes: string | null;
  leadmen: { id: string; name: string; role: string }[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [assignedToId, setAssignedToId] = useState(currentAssignedToId || "");
  const [scheduledDate, setScheduledDate] = useState(
    currentScheduledDate
      ? new Date(currentScheduledDate).toISOString().slice(0, 10)
      : ""
  );
  const [notes, setNotes] = useState(currentNotes || "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch(`/api/org/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignedToId: assignedToId || null,
        scheduledDate: scheduledDate || null,
        notes: notes || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Failed to save");
    }

    setSaving(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Assigned Leadman
        </label>
        <select
          value={assignedToId}
          onChange={(e) => setAssignedToId(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Unassigned</option>
          {leadmen.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Scheduled Date
        </label>
        <input
          type="date"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
