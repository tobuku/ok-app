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
    </div>
  );
}
