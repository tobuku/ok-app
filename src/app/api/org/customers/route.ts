import { NextRequest, NextResponse } from "next/server";
import { requireOrgUser } from "@/lib/auth";
import { tenantScope } from "@/lib/tenant";

/** GET /api/org/customers — list customers (Dispatcher, Org Admin) */
export async function GET() {
  const user = await requireOrgUser(["DISPATCHER", "ORG_ADMIN"]);
  if (user instanceof Response) return user;

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });
  const customers = await t.findMany("customer", {
    orderBy: { createdAt: "desc" },
    include: { addresses: true },
  });
  return NextResponse.json(customers);
}

/** POST /api/org/customers — create customer (Dispatcher, Org Admin) */
export async function POST(req: NextRequest) {
  const user = await requireOrgUser(["DISPATCHER", "ORG_ADMIN"], true);
  if (user instanceof Response) return user;

  const body = await req.json();
  const { name, phone, email, notes } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });
  const customer = await t.create("customer", {
    data: { name, phone: phone || null, email: email || null, notes: notes || null },
  });

  // Create address if provided
  if (body.address) {
    const { line1, city, state, zip } = body.address;
    if (line1 && city && state && zip) {
      await t.create("address", {
        data: {
          customerId: (customer as { id: string }).id,
          line1,
          line2: body.address.line2 || null,
          city,
          state,
          zip,
          lat: body.address.lat || null,
          lng: body.address.lng || null,
        },
      });
    }
  }

  return NextResponse.json(customer, { status: 201 });
}
