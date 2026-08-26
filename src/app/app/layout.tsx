import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/app-sidebar";
import { AppMobileNav } from "@/components/app-mobile-nav";
import { UserNav } from "@/components/user-nav";
import { CommandSearch } from "@/components/command-search";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await resolveAuth();
  if (!result.ok) redirect("/login");
  if ("platformUser" in result) redirect("/platform");

  const { user } = result;
  const isDispatcherOrAdmin = user.role === "DISPATCHER" || user.role === "ORG_ADMIN";
  const isAdmin = user.role === "ORG_ADMIN";

  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: { name: true, status: true, trialEndsAt: true },
  });
  const trialDaysLeft = org?.status === "TRIALING" && org.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(org.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar
        isAdmin={isAdmin}
        isDispatcherOrAdmin={isDispatcherOrAdmin}
        orgName={org?.name}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <AppMobileNav
          isAdmin={isAdmin}
          isDispatcherOrAdmin={isDispatcherOrAdmin}
          userName={user.name}
          userRole={user.role}
          orgName={org?.name}
        />

        {/* Desktop top bar */}
        <header className="hidden md:flex items-center justify-between h-14 px-6 border-b border-border bg-background">
          <CommandSearch />
          <UserNav name={user.name} role={user.role} />
        </header>

        {/* Banners */}
        {trialDaysLeft !== null && (
          <div className={`text-center text-sm py-2 ${
            trialDaysLeft <= 2
              ? "bg-destructive text-destructive-foreground"
              : "bg-muted text-muted-foreground"
          }`}>
            {trialDaysLeft === 0
              ? "Your trial expires today."
              : `${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""} left in your free trial.`}
            {isAdmin && (
              <Link href="/app/settings/billing" className="ml-2 underline font-medium">
                Subscribe now
              </Link>
            )}
          </div>
        )}
        {org?.status === "PAST_DUE" && (
          <div className="text-center text-sm py-2 bg-yellow-500 text-white dark:bg-yellow-600">
            Payment past due — account is read-only.
            {isAdmin && (
              <Link href="/app/settings/billing" className="ml-2 underline font-medium">
                Resolve
              </Link>
            )}
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
