import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isConnectAccountReady } from "@/lib/stripe-connect";
import { StripeConnectButton } from "./stripe-connect-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function StripeSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: urlStatus } = await searchParams;
  const result = await resolveAuth();
  if (!result.ok) redirect("/login");
  if (!("user" in result)) redirect("/platform");
  const { user } = result;

  if (user.role !== "ORG_ADMIN") redirect("/app");

  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: { name: true, stripeConnectAccountId: true },
  });

  let chargesEnabled = false;
  if (org?.stripeConnectAccountId) {
    chargesEnabled = await isConnectAccountReady(org.stripeConnectAccountId);
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Stripe Connection</h1>

      {urlStatus === "complete" && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-800 dark:text-green-400">
          Stripe onboarding complete. Refreshing status...
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-3 h-3 rounded-full ${
                chargesEnabled
                  ? "bg-green-500"
                  : org?.stripeConnectAccountId
                  ? "bg-yellow-500"
                  : "bg-muted-foreground/30"
              }`}
            />
            <span className="font-medium">
              {chargesEnabled
                ? "Connected — accepting payments"
                : org?.stripeConnectAccountId
                ? "Account created — onboarding incomplete"
                : "Not connected"}
            </span>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Connect your Stripe account to accept card payments from customers.
            Payments go directly to your bank account.
          </p>

          {chargesEnabled ? (
            <p className="text-sm text-muted-foreground">
              Account ID: {org?.stripeConnectAccountId}
            </p>
          ) : (
            <StripeConnectButton
              label={
                org?.stripeConnectAccountId
                  ? "Continue Onboarding"
                  : "Connect Stripe"
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
