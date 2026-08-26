import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "info" | "success" | "warning" | "destructive" | "secondary"> = {
  TRIALING: "info",
  ACTIVE: "success",
  PAST_DUE: "warning",
  SUSPENDED: "destructive",
  CANCELED: "secondary",
};

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
      <Link
        href="/platform/orgs"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to organizations
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">{org.name}</h1>
        <Badge variant={STATUS_VARIANT[org.status] || "secondary"}>
          {org.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Org details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-muted-foreground">Slug</span>
              <span>{org.slug}</span>
              <span className="text-muted-foreground">Timezone</span>
              <span>{org.timezone}</span>
              <span className="text-muted-foreground">Created</span>
              <span>{formatDate(org.createdAt)}</span>
              <span className="text-muted-foreground">Trial Ends</span>
              <span>{org.trialEndsAt ? formatDate(org.trialEndsAt) : "N/A"}</span>
              <span className="text-muted-foreground">Stripe Connect</span>
              <span>{org.stripeConnectAccountId ? "Connected" : "Not connected"}</span>
              <span className="text-muted-foreground">Stripe Customer</span>
              <span className="font-mono text-xs">{org.stripeCustomerId || "None"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-muted-foreground">Plan</span>
              <span>{org.subscription?.plan?.name ?? "None"}</span>
              <span className="text-muted-foreground">Subscription Status</span>
              <span>{org.subscription?.status ?? "N/A"}</span>
              <span className="text-muted-foreground">Users</span>
              <span>{org.users.length}</span>
              <span className="text-muted-foreground">Jobs</span>
              <span>{org._count.jobs}</span>
              <span className="text-muted-foreground">Customers</span>
              <span>{org._count.customers}</span>
              <span className="text-muted-foreground">Payments</span>
              <span>{org._count.payments}</span>
            </div>
          </CardContent>
        </Card>

        {/* Users */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {org.users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell className="text-muted-foreground">{u.role.replace("_", " ")}</TableCell>
                      <TableCell>
                        <Badge variant={u.active ? "success" : "secondary"}>
                          {u.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
