"use client";

import { useState } from "react";
import { formatCents } from "@/lib/format";
import { showError } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PlanOption = {
  id: string;
  name: string;
  priceCentsMonthly: number;
  maxUsers: number | null;
  maxJobsPerMonth: number | null;
  hasStripePrice: boolean;
};

export function BillingManager({
  orgName,
  orgStatus,
  trialEndsAt,
  hasStripeCustomer,
  subscription,
  plans,
}: {
  orgName: string;
  orgStatus: string;
  trialEndsAt: string | null;
  hasStripeCustomer: boolean;
  subscription: {
    planName: string;
    status: string;
    currentPeriodEnd: string | null;
  } | null;
  plans: PlanOption[];
}) {
  const [loading, setLoading] = useState(false);

  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  async function subscribe(planId: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/org/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || "Failed");
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      showError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/org/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || "Failed");
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      showError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Trial banner */}
      {orgStatus === "TRIALING" && trialDaysLeft !== null && (
        <Card className={
          trialDaysLeft <= 2
            ? "border-destructive bg-destructive/10"
            : "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30"
        }>
          <CardContent className="py-4 text-sm">
            {trialDaysLeft === 0
              ? "Your trial expires today. Subscribe to keep using the platform."
              : `${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""} left in your free trial.`
            }
          </CardContent>
        </Card>
      )}

      {orgStatus === "PAST_DUE" && (
        <Card className="border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950/30">
          <CardContent className="py-4 text-sm text-yellow-800 dark:text-yellow-400">
            Your subscription is past due. The account is in read-only mode until payment is resolved.
          </CardContent>
        </Card>
      )}

      {orgStatus === "SUSPENDED" && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="py-4 text-sm text-destructive">
            Your account is suspended. Contact support to resolve.
          </CardContent>
        </Card>
      )}

      {/* Current subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium text-foreground">{subscription.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium text-foreground capitalize">{subscription.status}</span>
              </div>
              {subscription.currentPeriodEnd && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current period ends</span>
                  <span className="text-foreground">
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active subscription.</p>
          )}

          {hasStripeCustomer && (
            <Button
              variant="secondary"
              size="sm"
              onClick={openPortal}
              disabled={loading}
              className="mt-4"
            >
              Manage Billing
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Available plans */}
      {(!subscription || subscription.status === "canceled") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Choose a Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg"
              >
                <div>
                  <p className="font-medium text-foreground">{plan.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {plan.priceCentsMonthly === 0
                      ? "Custom pricing"
                      : `${formatCents(plan.priceCentsMonthly)}/month`}
                    {plan.maxUsers ? ` — up to ${plan.maxUsers} users` : " — unlimited users"}
                    {plan.maxJobsPerMonth ? `, ${plan.maxJobsPerMonth} jobs/mo` : ""}
                  </p>
                </div>
                {plan.hasStripePrice ? (
                  <Button
                    onClick={() => subscribe(plan.id)}
                    disabled={loading}
                    size="sm"
                  >
                    Subscribe
                  </Button>
                ) : plan.priceCentsMonthly === 0 ? (
                  <span className="text-xs text-muted-foreground">Contact us</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Not available</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
