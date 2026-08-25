"use client";

import { useState, useEffect } from "react";
import { formatCents } from "@/lib/format";

type Plan = {
  id: string;
  name: string;
  priceCentsMonthly: number;
  maxUsers: number | null;
  maxJobsPerMonth: number | null;
  features: Record<string, unknown>;
  active: boolean;
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  function loadPlans() {
    fetch("/api/platform/plans")
      .then((r) => r.json())
      .then(setPlans)
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadPlans(); }, []);

  async function toggleActive(plan: Plan) {
    await fetch("/api/platform/plans", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: plan.id, active: !plan.active }),
    });
    loadPlans();
  }

  if (loading) return <p className="text-gray-400">Loading plans...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Plans</h1>
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-700">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price/mo</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Max Users</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Max Jobs/mo</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stripe Price ID</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {plans.map((plan) => (
              <tr key={plan.id} className={!plan.active ? "opacity-50" : ""}>
                <td className="px-4 py-3 text-sm font-medium text-white">{plan.name}</td>
                <td className="px-4 py-3 text-sm text-gray-300 text-right">
                  {plan.priceCentsMonthly === 0 ? "Custom" : formatCents(plan.priceCentsMonthly)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-400 text-right">
                  {plan.maxUsers ?? "Unlimited"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-400 text-right">
                  {plan.maxJobsPerMonth ?? "Unlimited"}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                  {(plan.features as Record<string, string>)?.stripePriceId || "Not set"}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    plan.active ? "bg-green-900 text-green-300" : "bg-gray-700 text-gray-500"
                  }`}>
                    {plan.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  <button
                    onClick={() => toggleActive(plan)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    {plan.active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 mt-4">
        Create Stripe Price IDs in the Stripe Dashboard, then update each plan's features JSON to include the stripePriceId.
      </p>
    </div>
  );
}
