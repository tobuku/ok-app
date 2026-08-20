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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14">
            <div className="flex items-center gap-6">
              <Link href="/app" className="font-bold text-lg text-gray-900">
                Jobs
              </Link>
              {isDispatcherOrAdmin && (
                <>
                  <Link
                    href="/app/calendar"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Calendar
                  </Link>
                  <Link
                    href="/app/customers"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Customers
                  </Link>
                </>
              )}
              {user.role === "ORG_ADMIN" && (
                <Link
                  href="/app/pricebook"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Price Book
                </Link>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
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
