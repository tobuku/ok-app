/**
 * /m/profile — Leadman profile + daily summary (#6)
 */
import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DailySummary } from "./daily-summary";
import { LogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const result = await resolveAuth();
  if (!result.ok) redirect("/login");
  if (!("user" in result)) redirect("/platform");
  const { user } = result;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="font-medium">{user.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Role</p>
            <p className="font-medium capitalize">{user.role.toLowerCase().replace("_", " ")}</p>
          </div>
        </CardContent>
      </Card>

      <DailySummary />

      <LogoutButton />
    </div>
  );
}
