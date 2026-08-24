import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "./logout-button";

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

  const navLink = "text-sm text-gray-600 hover:text-gray-900";

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14">
            <div className="flex items-center gap-5 overflow-x-auto">
              <Link href="/app" className="font-bold text-lg text-gray-900 shrink-0">
                Jobs
              </Link>
              {isDispatcherOrAdmin && (
                <>
                  <Link href="/app/calendar" className={navLink}>Calendar</Link>
                  <Link href="/app/customers" className={navLink}>Customers</Link>
                  <Link href="/app/map" className={navLink}>Map</Link>
                  <Link href="/app/trucks" className={navLink}>Trucks</Link>
                  <Link href="/app/dumpsites" className={navLink}>Dump Sites</Link>
                  <Link href="/app/dumpruns" className={navLink}>Dump Runs</Link>
                </>
              )}
              {isAdmin && (
                <>
                  <Link href="/app/reports" className={navLink}>Reports</Link>
                  <Link href="/app/pricebook" className={navLink}>Price Book</Link>
                  <Link href="/app/users" className={navLink}>Team</Link>
                  <Link href="/app/settings/branding" className={navLink}>Settings</Link>
                </>
              )}
            </div>
            <div className="flex items-center gap-4 shrink-0 ml-4">
              <span className="text-sm text-gray-500 hidden sm:inline">
                {user.name} ({user.role.replace("_", " ")})
              </span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
