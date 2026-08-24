import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UserManager } from "./user-manager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const result = await resolveAuth();
  if (!result.ok) redirect("/login");
  if (!("user" in result)) redirect("/platform");
  const { user } = result;

  if (user.role !== "ORG_ADMIN") redirect("/app");

  const users = await prisma.user.findMany({
    where: { orgId: user.orgId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      active: true,
      invitedAt: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Team Members</h1>
      <UserManager
        initialUsers={users.map((u) => ({
          ...u,
          invitedAt: u.invitedAt?.toISOString() ?? null,
          createdAt: u.createdAt.toISOString(),
        }))}
        currentUserId={user.id}
      />
    </div>
  );
}
