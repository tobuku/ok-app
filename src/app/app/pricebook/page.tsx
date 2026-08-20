import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tenantScope } from "@/lib/tenant";
import { PriceBookEditor } from "./price-book-editor";

export const dynamic = "force-dynamic";

export default async function PriceBookPage() {
  const result = await resolveAuth();
  if (!result.ok) redirect("/login");
  if (!("user" in result)) redirect("/platform");
  const { user } = result;

  if (user.role !== "ORG_ADMIN") {
    return (
      <div className="p-6">
        <p className="text-red-600">Only Org Admins can manage the price book.</p>
      </div>
    );
  }

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });

  const priceBook = await t.findFirst<{ id: string; name: string }>("priceBook", {
    where: { active: true },
  });

  const items = priceBook
    ? await t.findMany<{
        id: string;
        kind: string;
        label: string;
        fraction: number | null;
        amountCents: number;
        sortOrder: number;
        active: boolean;
      }>("priceItem", {
        where: { priceBookId: priceBook.id },
        orderBy: { sortOrder: "asc" },
      })
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Price Book</h1>
      {priceBook ? (
        <PriceBookEditor
          priceBookId={priceBook.id}
          priceBookName={priceBook.name}
          initialItems={items}
        />
      ) : (
        <p className="text-gray-500">No price book found. Contact support.</p>
      )}
    </div>
  );
}
