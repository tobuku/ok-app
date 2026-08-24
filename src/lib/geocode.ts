/**
 * Geocode an address to lat/lng using OpenStreetMap Nominatim.
 * Free, no API key. Rate limit: 1 req/sec (enforced by User-Agent policy).
 * Returns null if geocoding fails — never blocks address creation.
 */
export async function geocode(address: {
  line1: string;
  city: string;
  state: string;
  zip: string;
}): Promise<{ lat: number; lng: number } | null> {
  const query = `${address.line1}, ${address.city}, ${address.state} ${address.zip}`;

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "us");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "ok-app/1.0 (junk removal saas)",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);

    if (isNaN(lat) || isNaN(lng)) return null;

    return { lat, lng };
  } catch {
    // Geocoding is best-effort — never block the caller
    return null;
  }
}
