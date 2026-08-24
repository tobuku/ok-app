import { NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geocode } from "@/lib/geocode";

/**
 * POST /api/org/geocode-backfill
 * Geocode all addresses in the org that are missing lat/lng.
 * Respects Nominatim's 1 req/sec rate limit.
 * Org Admin only.
 */
export async function POST() {
  const user = await requireOrgUser(["ORG_ADMIN"], true);
  if (user instanceof Response) return user;

  const addresses = await prisma.address.findMany({
    where: {
      orgId: user.orgId,
      lat: null,
    },
    select: { id: true, line1: true, city: true, state: true, zip: true },
  });

  let updated = 0;
  let failed = 0;

  for (const addr of addresses) {
    const coords = await geocode({
      line1: addr.line1,
      city: addr.city,
      state: addr.state,
      zip: addr.zip,
    });

    if (coords) {
      await prisma.address.update({
        where: { id: addr.id },
        data: { lat: coords.lat, lng: coords.lng },
      });
      updated++;
    } else {
      failed++;
    }

    // Nominatim rate limit: 1 request per second
    if (addresses.indexOf(addr) < addresses.length - 1) {
      await new Promise((r) => setTimeout(r, 1100));
    }
  }

  return NextResponse.json({
    total: addresses.length,
    updated,
    failed,
  });
}
