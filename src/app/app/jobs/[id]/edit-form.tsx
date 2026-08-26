"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { showSuccess, showError } from "@/lib/toast";

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
      showError(data.error || "Failed to save");
    } else {
      showSuccess("Saved");
    }

    setSaving(false);
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="assigned-leadman">Assigned Leadman</Label>
            <select
              id="assigned-leadman"
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
            <Label htmlFor="scheduled-date">Scheduled Date</Label>
            <Input
              id="scheduled-date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
