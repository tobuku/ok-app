"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/lib/toast";
import { PhotoAnnotate } from "./photo-annotate";

export function PhotoCapture({
  jobId,
  type,
}: {
  jobId: string;
  type: "before" | "after";
}) {
  const [uploading, setUploading] = useState(false);
  const [annotateFile, setAnnotateFile] = useState<File | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("type", type);
    for (const file of files) {
      formData.append("files", file);
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

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    if (files.length === 1) {
      // Single photo — offer annotation
      setAnnotateFile(files[0]);
      setPendingFiles([]);
    } else {
      // Multiple photos — upload directly
      uploadFiles(files);
    }
  }

  function handleAnnotateSave(blob: Blob) {
    const file = new File([blob], annotateFile?.name ?? "photo.jpg", {
      type: "image/jpeg",
    });
    setAnnotateFile(null);
    uploadFiles([file, ...pendingFiles]);
    setPendingFiles([]);
  }

  function handleAnnotateCancel() {
    // Upload original without annotation
    if (annotateFile) {
      uploadFiles([annotateFile, ...pendingFiles]);
    }
    setAnnotateFile(null);
    setPendingFiles([]);
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

      {annotateFile && (
        <PhotoAnnotate
          imageFile={annotateFile}
          onSave={handleAnnotateSave}
          onCancel={handleAnnotateCancel}
        />
      )}
    </div>
  );
}
