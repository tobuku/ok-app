/**
 * Simple in-memory rate limiter for Edge Middleware.
 * Tracks request counts per IP within a sliding window.
 * State persists within a single edge function instance on Vercel.
 */

const hits = new Map<string, { count: number; resetAt: number }>();

// Clean up stale entries periodically (every 100 calls)
let cleanupCounter = 0;
function maybeCleanup() {
  cleanupCounter++;
  if (cleanupCounter < 100) return;
  cleanupCounter = 0;
  const now = Date.now();
  for (const [key, val] of hits) {
    if (val.resetAt < now) hits.delete(key);
  }
}

/**
 * Check if a request should be rate-limited.
 * @returns true if the request should be BLOCKED
 */
export function isRateLimited(
  ip: string,
  path: string,
  maxRequests: number = 10,
  windowMs: number = 60_000
): boolean {
  maybeCleanup();
  const key = `${ip}:${path}`;
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count++;
  return entry.count > maxRequests;
}
