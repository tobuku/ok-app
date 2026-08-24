import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReportsDashboard } from "./reports-dashboard";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const result = await resolveAuth();
  if (!result.ok) redirect("/login");
  if (!("user" in result)) redirect("/platform");
  const { user } = result;

  if (user.role !== "ORG_ADMIN") redirect("/app");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Reports</h1>
      <ReportsDashboard />
    </div>
  );
}
