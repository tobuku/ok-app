/**
 * POST /api/org/quotes/:id/present — Mark quote as PRESENTED to customer
 */
import { NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { tenantScope } from "@/lib/tenant";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: quoteId } = await params;
  const userOrRes = await requireOrgUser(["LEADMAN", "ORG_ADMIN"], true);
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes;

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  const quote = await t.findFirst<{ id: string; status: string }>("quote", {
    where: { id: quoteId },
  });
  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }
  if (quote.status !== "DRAFT") {
    return NextResponse.json(
      { error: `Cannot present quote in status ${quote.status}` },
      { status: 400 }
    );
  }

  await t.update("quote", {
    where: { id: quoteId },
    data: { status: "PRESENTED" },
  });

  return NextResponse.json({ status: "PRESENTED" });
}
