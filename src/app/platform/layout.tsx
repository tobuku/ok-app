import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PlatformSidebar } from "@/components/platform-sidebar";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await resolveAuth();
  if (!result.ok) redirect("/login");
  if (!("platformUser" in result)) redirect("/app");

  const { platformUser } = result;

  return (
    <div className="dark flex h-screen overflow-hidden bg-background text-foreground">
      <PlatformSidebar userName={platformUser.name} />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}
