/**
 * GET   /api/org/pricebook — Get active price book + items
 * PATCH /api/org/pricebook — Update price items (Org Admin only)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { tenantScope } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userOrRes = await requireOrgUser(["LEADMAN", "DISPATCHER", "ORG_ADMIN"]);
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes;

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  const priceBook = await t.findFirst<{
    id: string;
    name: string;
  }>("priceBook", {
    where: { active: true },
  });

  if (!priceBook) {
    return NextResponse.json({ priceBook: null, items: [] });
  }

  const items = await t.findMany("priceItem", {
    where: { priceBookId: priceBook.id, active: true },
    orderBy: { sortOrder: "asc" },
  });

  // Get usage counts for each price item (last 90 days) for smart sorting (#10)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const usageCounts = await prisma.quoteLine.groupBy({
    by: ["priceItemId"],
    where: {
      orgId: user.orgId,
      priceItemId: { not: null },
      quote: { createdAt: { gte: ninetyDaysAgo } },
    },
    _count: { id: true },
  });
  const usageMap: Record<string, number> = {};
  for (const u of usageCounts) {
    if (u.priceItemId) usageMap[u.priceItemId] = u._count.id;
  }

  const itemsWithUsage = (items as Array<Record<string, unknown>>).map((item) => ({
    ...item,
    usageCount: usageMap[(item as { id: string }).id] ?? 0,
  }));

  return NextResponse.json({ priceBook, items: itemsWithUsage });
}

export async function PATCH(request: NextRequest) {
  const userOrRes = await requireOrgUser(["ORG_ADMIN"], true);
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes;

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });
  const body = await request.json();

  // body.items: array of { id?, label, kind, fraction?, amountCents, sortOrder, active }
  const { items, priceBookId } = body;
  if (!priceBookId || !Array.isArray(items)) {
    return NextResponse.json({ error: "priceBookId and items[] required" }, { status: 400 });
  }

  // Verify price book belongs to org
  const pb = await t.findFirst("priceBook", { where: { id: priceBookId } });
  if (!pb) {
    return NextResponse.json({ error: "Price book not found" }, { status: 404 });
  }

  const results = [];
  for (const item of items) {
    if (item.id) {
      // Update existing
      const updated = await t.update("priceItem", {
        where: { id: item.id },
        data: {
          label: item.label,
          kind: item.kind,
          fraction: item.fraction ?? null,
          amountCents: item.amountCents,
          sortOrder: item.sortOrder,
          active: item.active ?? true,
        },
      });
      results.push(updated);
    } else {
      // Create new
      const created = await t.create("priceItem", {
        data: {
          priceBookId,
          label: item.label,
          kind: item.kind,
          fraction: item.fraction ?? null,
          amountCents: item.amountCents,
          sortOrder: item.sortOrder,
          active: item.active ?? true,
        },
      });
      results.push(created);
    }
  }

  return NextResponse.json({ items: results });
}
