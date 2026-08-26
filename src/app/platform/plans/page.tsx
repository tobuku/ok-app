"use client";

import { useState, useEffect } from "react";
import { formatCents } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

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

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Plans</h1>
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Price/mo</TableHead>
              <TableHead className="text-right">Max Users</TableHead>
              <TableHead className="text-right">Max Jobs/mo</TableHead>
              <TableHead>Stripe Price ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id} className={!plan.active ? "opacity-50" : ""}>
                <TableCell className="font-medium">{plan.name}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {plan.priceCentsMonthly === 0 ? "Custom" : formatCents(plan.priceCentsMonthly)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {plan.maxUsers ?? "Unlimited"}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {plan.maxJobsPerMonth ?? "Unlimited"}
                </TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {(plan.features as Record<string, string>)?.stripePriceId || "Not set"}
                </TableCell>
                <TableCell>
                  <Badge variant={plan.active ? "success" : "secondary"}>
                    {plan.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(plan)}
                  >
                    {plan.active ? "Deactivate" : "Activate"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        Create Stripe Price IDs in the Stripe Dashboard, then update each plan's features JSON to include the stripePriceId.
      </p>
    </div>
  );
}
