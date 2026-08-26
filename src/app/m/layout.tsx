import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

export const dynamic = "force-dynamic";

export default async function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await resolveAuth();
  if (!result.ok) redirect("/login");
  if (!("user" in result)) redirect("/platform");

  const { user } = result;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <span className="font-bold text-foreground">Today</span>
        <span className="text-xs text-muted-foreground">{user.name}</span>
      </header>
      <main className="flex-1 p-4 pb-20">{children}</main>
      <MobileBottomNav />
    </div>
  );
}
