import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const result = await resolveAuth();
  if (!result.ok) redirect("/login");
  if (!("platformUser" in result)) redirect("/app");

  const { id } = await params;

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      subscription: { include: { plan: true } },
      users: {
        select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { jobs: true, customers: true, payments: true } },
    },
  });

  if (!org) redirect("/platform/orgs");

  return (
    <div>
      <Link href="/platform/orgs" className="text-sm text-blue-400 hover:text-blue-300 mb-4 block">
        Back to organizations
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-white">{org.name}</h1>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
          org.status === "ACTIVE" ? "bg-green-900 text-green-300" :
          org.status === "TRIALING" ? "bg-blue-900 text-blue-300" :
          org.status === "SUSPENDED" ? "bg-red-900 text-red-300" :
          "bg-gray-700 text-gray-400"
        }`}>
          {org.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Org details */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 space-y-3">
          <h2 className="text-sm font-medium text-gray-400">Details</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-500">Slug</div>
            <div className="text-white">{org.slug}</div>
            <div className="text-gray-500">Timezone</div>
            <div className="text-white">{org.timezone}</div>
            <div className="text-gray-500">Created</div>
            <div className="text-white">{formatDate(org.createdAt)}</div>
            <div className="text-gray-500">Trial Ends</div>
            <div className="text-white">{org.trialEndsAt ? formatDate(org.trialEndsAt) : "N/A"}</div>
            <div className="text-gray-500">Stripe Connect</div>
            <div className="text-white">{org.stripeConnectAccountId ? "Connected" : "Not connected"}</div>
            <div className="text-gray-500">Stripe Customer</div>
            <div className="text-white font-mono text-xs">{org.stripeCustomerId || "None"}</div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 space-y-3">
          <h2 className="text-sm font-medium text-gray-400">Usage</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-500">Plan</div>
            <div className="text-white">{org.subscription?.plan?.name ?? "None"}</div>
            <div className="text-gray-500">Subscription Status</div>
            <div className="text-white">{org.subscription?.status ?? "N/A"}</div>
            <div className="text-gray-500">Users</div>
            <div className="text-white">{org.users.length}</div>
            <div className="text-gray-500">Jobs</div>
            <div className="text-white">{org._count.jobs}</div>
            <div className="text-gray-500">Customers</div>
            <div className="text-white">{org._count.customers}</div>
            <div className="text-gray-500">Payments</div>
            <div className="text-white">{org._count.payments}</div>
          </div>
        </div>

        {/* Users */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 lg:col-span-2">
          <h2 className="text-sm font-medium text-gray-400 mb-3">Team Members</h2>
          <table className="min-w-full divide-y divide-gray-700 text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase">Name</th>
                <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase">Email</th>
                <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase">Role</th>
                <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {org.users.map((u) => (
                <tr key={u.id}>
                  <td className="px-3 py-2 text-white">{u.name}</td>
                  <td className="px-3 py-2 text-gray-400">{u.email}</td>
                  <td className="px-3 py-2 text-gray-400">{u.role.replace("_", " ")}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      u.active ? "bg-green-900 text-green-300" : "bg-gray-700 text-gray-500"
                    }`}>
                      {u.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
