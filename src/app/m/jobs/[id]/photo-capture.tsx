"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/lib/toast";

export function PhotoCapture({
  jobId,
  type,
}: {
  jobId: string;
  type: "before" | "after";
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("type", type);
    for (let i = 0; i < fileList.length; i++) {
      formData.append("files", fileList[i]);
    }

    try {
      const res = await fetch(`/api/org/jobs/${jobId}/photos`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || "Upload failed");
      } else {
        const count = data.photos.filter(
          (p: { photoId?: string }) => p.photoId
        ).length;
        showSuccess(
          `${count} photo${count !== 1 ? "s" : ""} uploaded`
        );
      }
    } catch {
      showError("Network error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
        id={`photo-${type}`}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full h-12 border-2 border-dashed text-sm font-medium"
      >
        {uploading
          ? "Uploading..."
          : `Take ${type === "before" ? "Before" : "After"} Photos`}
      </Button>
    </div>
  );
}
