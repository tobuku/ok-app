"use client";

import { useState, useEffect } from "react";

type Photo = {
  id: string;
  type: string;
  url: string | null;
  takenAt: string;
};

export function PhotoGallery({ jobId }: { jobId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/org/jobs/${jobId}/photos`)
      .then((res) => res.json())
      .then((data) => setPhotos(data.photos || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [jobId]);

  if (loading) return <p className="text-xs text-gray-400">Loading photos...</p>;
  if (photos.length === 0) return null;

  const before = photos.filter((p) => p.type === "BEFORE");
  const after = photos.filter((p) => p.type === "AFTER");

  return (
    <div className="space-y-3">
      {before.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">
            Before ({before.length})
          </p>
          <div className="flex gap-2 overflow-x-auto">
            {before.map((p) => (
              <PhotoThumb key={p.id} photo={p} />
            ))}
          </div>
        </div>
      )}
      {after.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">
            After ({after.length})
          </p>
          <div className="flex gap-2 overflow-x-auto">
            {after.map((p) => (
              <PhotoThumb key={p.id} photo={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PhotoThumb({ photo }: { photo: Photo }) {
  if (!photo.url) return null;
  return (
    <a href={photo.url} target="_blank" rel="noopener noreferrer">
      <img
        src={photo.url}
        alt={`${photo.type} photo`}
        className="w-20 h-20 object-cover rounded-md border border-gray-200"
      />
    </a>
  );
}
