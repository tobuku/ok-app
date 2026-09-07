"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "lucide-react";
import { showError } from "@/lib/toast";

type Photo = {
  id: string;
  type: string;
  url: string | null;
  takenAt: string;
};

export function PhotoGallery({ jobId }: { jobId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/org/jobs/${jobId}/photos`)
      .then((res) => res.json())
      .then((data) => setPhotos(data.photos || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [jobId]);

  async function deletePhoto(photoId: string) {
    if (!confirm("Delete this photo?")) return;
    setDeleting(photoId);
    try {
      const res = await fetch(
        `/api/org/jobs/${jobId}/photos?photoId=${photoId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        showError(data.error || "Failed to delete photo");
        return;
      }
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch {
      showError("Network error");
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-2">
          <Skeleton className="w-20 h-20 rounded-md" />
          <Skeleton className="w-20 h-20 rounded-md" />
          <Skeleton className="w-20 h-20 rounded-md" />
        </div>
      </div>
    );
  }

  if (photos.length === 0) return null;

  const before = photos.filter((p) => p.type === "BEFORE");
  const after = photos.filter((p) => p.type === "AFTER");

  return (
    <div className="space-y-3">
      {before.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
            Before ({before.length})
          </p>
          <div className="flex gap-2 overflow-x-auto">
            {before.map((p) => (
              <PhotoThumb key={p.id} photo={p} onDelete={deletePhoto} deleting={deleting === p.id} />
            ))}
          </div>
        </div>
      )}
      {after.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
            After ({after.length})
          </p>
          <div className="flex gap-2 overflow-x-auto">
            {after.map((p) => (
              <PhotoThumb key={p.id} photo={p} onDelete={deletePhoto} deleting={deleting === p.id} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PhotoThumb({
  photo,
  onDelete,
  deleting,
}: {
  photo: Photo;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  if (!photo.url) return null;
  return (
    <div className="relative shrink-0">
      <a href={photo.url} target="_blank" rel="noopener noreferrer">
        <img
          src={photo.url}
          alt={`${photo.type} photo`}
          className={`w-20 h-20 object-cover rounded-md border border-border ${deleting ? "opacity-40" : ""}`}
        />
      </a>
      <button
        type="button"
        onClick={() => onDelete(photo.id)}
        disabled={deleting}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-sm hover:bg-destructive/90"
        aria-label="Delete photo"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
