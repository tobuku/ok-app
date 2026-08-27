"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { showError, showSuccess } from "@/lib/toast";

type NoteEntry = {
  id: string;
  text: string;
  createdByName: string;
  createdAt: string;
};

export function JobNotes({
  jobId,
  addressId,
  jobStatus,
}: {
  jobId: string;
  addressId: string | null;
  jobStatus: string;
}) {
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [text, setText] = useState("");
  const [isAddressNote, setIsAddressNote] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/org/jobs/${jobId}/notes`)
      .then((r) => r.json())
      .then((data) => setNotes(data.notes || []))
      .catch(() => {});
  }, [jobId]);

  const isClosed = ["COMPLETED", "CANCELED"].includes(jobStatus);

  async function handleAdd() {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/org/jobs/${jobId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          isAddressNote: isAddressNote && !!addressId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || "Failed to add note");
      } else {
        setNotes((prev) => [data.note, ...prev]);
        setText("");
        setIsAddressNote(false);
        showSuccess("Note added");
      }
    } catch {
      showError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase">Job Notes</p>

      {/* Add note form */}
      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={isClosed ? "Add follow-up note..." : "Add a note..."}
          rows={2}
          className="text-sm"
        />
        {addressId && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={isAddressNote}
              onChange={(e) => setIsAddressNote(e.target.checked)}
              className="rounded border-border"
            />
            Save as address warning (e.g. stairs, dog, slope)
          </label>
        )}
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={!text.trim() || submitting}
          className="min-h-[44px]"
        >
          {submitting ? "Adding..." : "Add Note"}
        </Button>
      </div>

      {/* Notes log */}
      {notes.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {notes.map((n) => (
            <div key={n.id} className="p-2 bg-muted/50 rounded text-sm">
              <p className="whitespace-pre-wrap">{n.text}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {n.createdByName} &middot;{" "}
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
