"use client";

import { useState } from "react";
import { formatCents } from "@/lib/format";

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
  const [message, setMessage] = useState<string | null>(null);

  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  async function subscribe(planId: string) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/org/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed");
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setMessage("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function openPortal() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/org/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed");
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setMessage("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Trial banner */}
      {orgStatus === "TRIALING" && trialDaysLeft !== null && (
        <div className={`p-4 rounded-lg text-sm ${
          trialDaysLeft <= 2
            ? "bg-red-50 border border-red-200 text-red-800"
            : "bg-blue-50 border border-blue-200 text-blue-800"
        }`}>
          {trialDaysLeft === 0
            ? "Your trial expires today. Subscribe to keep using the platform."
            : `${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""} left in your free trial.`
          }
        </div>
      )}

      {orgStatus === "PAST_DUE" && (
        <div className="p-4 rounded-lg text-sm bg-yellow-50 border border-yellow-200 text-yellow-800">
          Your subscription is past due. The account is in read-only mode until payment is resolved.
        </div>
      )}

      {orgStatus === "SUSPENDED" && (
        <div className="p-4 rounded-lg text-sm bg-red-50 border border-red-200 text-red-800">
          Your account is suspended. Contact support to resolve.
        </div>
      )}

      {/* Current subscription */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Current Plan</h2>
        {subscription ? (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Plan</span>
              <span className="font-medium text-gray-900">{subscription.planName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status</span>
              <span className="font-medium text-gray-900 capitalize">{subscription.status}</span>
            </div>
            {subscription.currentPeriodEnd && (
              <div className="flex justify-between">
                <span className="text-gray-600">Current period ends</span>
                <span className="text-gray-900">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No active subscription.</p>
        )}

        {hasStripeCustomer && (
          <button
            onClick={openPortal}
            disabled={loading}
            className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
          >
            Manage Billing
          </button>
        )}
      </div>

      {/* Available plans */}
      {(!subscription || subscription.status === "canceled") && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Choose a Plan</h2>
          <div className="space-y-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{plan.name}</p>
                  <p className="text-sm text-gray-500">
                    {plan.priceCentsMonthly === 0
                      ? "Custom pricing"
                      : `${formatCents(plan.priceCentsMonthly)}/month`}
                    {plan.maxUsers ? ` — up to ${plan.maxUsers} users` : " — unlimited users"}
                    {plan.maxJobsPerMonth ? `, ${plan.maxJobsPerMonth} jobs/mo` : ""}
                  </p>
                </div>
                {plan.hasStripePrice ? (
                  <button
                    onClick={() => subscribe(plan.id)}
                    disabled={loading}
                    className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    Subscribe
                  </button>
                ) : plan.priceCentsMonthly === 0 ? (
                  <span className="text-xs text-gray-500">Contact us</span>
                ) : (
                  <span className="text-xs text-gray-400">Not available</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {message && <p className="text-sm text-red-600">{message}</p>}
    </div>
  );
}
