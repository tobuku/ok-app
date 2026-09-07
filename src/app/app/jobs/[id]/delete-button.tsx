"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { showError } from "@/lib/toast";

export function DeleteJobButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Permanently delete this job and all its photos, quotes, and payments? This cannot be undone.")) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/org/jobs/${jobId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        showError(data.error || "Failed to delete job");
        return;
      }
      router.push("/app");
    } catch {
      showError("Network error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="destructive"
      onClick={handleDelete}
      disabled={deleting}
      className="w-full"
    >
      <Trash2 className="h-4 w-4 mr-2" />
      {deleting ? "Deleting..." : "Delete Job"}
    </Button>
  );
}
