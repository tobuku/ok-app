/**
 * Client-side geographic utilities for dispatch map.
 * Haversine formula for straight-line distance — no external API needed.
 */

const EARTH_RADIUS_MI = 3958.8;

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MI * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type PointWithDistance<T> = T & { distance: number };

export function sortByDistance<T extends { lat: number; lng: number }>(
  origin: { lat: number; lng: number },
  points: T[]
): PointWithDistance<T>[] {
  return points
    .map((p) => ({
      ...p,
      distance: haversineDistance(origin.lat, origin.lng, p.lat, p.lng),
    }))
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Nearest-neighbor route optimization.
 * Returns indices in visit order, starting from the closest to origin.
 */
export function optimizeRoute<T extends { lat: number; lng: number }>(
  origin: { lat: number; lng: number },
  points: T[]
): number[] {
  if (points.length === 0) return [];

  const visited = new Set<number>();
  const order: number[] = [];
  let current = origin;

  while (visited.size < points.length) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      if (visited.has(i)) continue;
      const d = haversineDistance(current.lat, current.lng, points[i].lat, points[i].lng);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    visited.add(bestIdx);
    order.push(bestIdx);
    current = points[bestIdx];
  }

  return order;
}
