import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "../app/logout-button";

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

  const navLink = "text-sm text-gray-300 hover:text-white";

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14">
            <div className="flex items-center gap-6">
              <Link href="/platform" className="font-bold text-lg text-white">
                Platform
              </Link>
              <Link href="/platform/orgs" className={navLink}>Organizations</Link>
              <Link href="/platform/plans" className={navLink}>Plans</Link>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">{platformUser.name}</span>
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
