import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tenantScope } from "@/lib/tenant";
import { TruckManager } from "./truck-manager";

export const dynamic = "force-dynamic";

export default async function TrucksPage() {
  const result = await resolveAuth();
  if (!result.ok) redirect("/login");
  if (!("user" in result)) redirect("/platform");
  const { user } = result;

  if (user.role === "LEADMAN") redirect("/m");

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });
  const trucks = (await t.findMany("truck", {
    orderBy: { name: "asc" },
  })) as { id: string; name: string; capacityCubicYards: number | null; active: boolean }[];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Trucks</h1>
      <TruckManager initialTrucks={trucks} isAdmin={user.role === "ORG_ADMIN"} />
    </div>
  );
}
