import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "../app/logout-button";

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b border-gray-200 px-4 h-12 flex items-center justify-between">
        <Link href="/m" className="font-bold text-gray-900">
          Today
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{user.name}</span>
          <LogoutButton />
        </div>
      </nav>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
