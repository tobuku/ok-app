import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { JobMap } from "./job-map";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const result = await resolveAuth();
  if (!result.ok) redirect("/login");
  if (!("user" in result)) redirect("/platform");
  const { user } = result;

  if (user.role === "LEADMAN") redirect("/m");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Job Map</h1>
      <JobMap />
      <p className="text-xs text-destructive mt-3">
        Only jobs with geocoded addresses appear on the map. To add a location: go to Customers, add or edit an address, then click &quot;Geocode&quot; to set the lat/lng coordinates. Jobs linked to that address will then show as map pins.
      </p>
    </div>
  );
}
