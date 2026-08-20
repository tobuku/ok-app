"use client";

import { useState, useRef } from "react";

export function PhotoCapture({
  jobId,
  type,
}: {
  jobId: string;
  type: "before" | "after";
}) {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError(null);

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
        setError(data.error || "Upload failed");
      } else {
        const names = data.photos
          .filter((p: { photoId?: string }) => p.photoId)
          .map((p: { filename: string }) => p.filename);
        setUploaded((prev) => [...prev, ...names]);
      }
    } catch {
      setError("Network error");
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
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`w-full py-3 px-4 rounded-lg border-2 border-dashed text-sm font-medium
          ${uploading ? "border-gray-300 text-gray-400" : "border-blue-300 text-blue-600 hover:bg-blue-50"}`}
      >
        {uploading
          ? "Uploading..."
          : `Take ${type === "before" ? "Before" : "After"} Photos`}
      </button>

      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}

      {uploaded.length > 0 && (
        <p className="text-green-600 text-xs mt-1">
          {uploaded.length} photo{uploaded.length !== 1 ? "s" : ""} uploaded
        </p>
      )}
    </div>
  );
}
