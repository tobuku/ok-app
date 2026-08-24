import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tenantScope } from "@/lib/tenant";
import { DumpSiteManager } from "./dump-site-manager";

export const dynamic = "force-dynamic";

export default async function DumpSitesPage() {
  const result = await resolveAuth();
  if (!result.ok) redirect("/login");
  if (!("user" in result)) redirect("/platform");
  const { user } = result;

  if (user.role === "LEADMAN") redirect("/m");

  const t = tenantScope({ orgId: user.orgId, actorUserId: user.id });
  const sites = (await t.findMany("dumpSite", {
    orderBy: { name: "asc" },
  })) as {
    id: string;
    name: string;
    address: string | null;
    hours: string | null;
    acceptedMaterials: string | null;
    feeNotes: string | null;
    active: boolean;
  }[];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dump Sites</h1>
      <DumpSiteManager initialSites={sites} isAdmin={user.role === "ORG_ADMIN"} />
    </div>
  );
}
