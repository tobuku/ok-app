"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { showSuccess, showError } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";

type Org = {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  stripeConnectAccountId: string | null;
  subscription: { plan: { name: string } } | null;
  _count: { users: number; jobs: number };
};

const STATUS_VARIANT: Record<string, "info" | "success" | "warning" | "destructive" | "secondary"> = {
  TRIALING: "info",
  ACTIVE: "success",
  PAST_DUE: "warning",
  SUSPENDED: "destructive",
  CANCELED: "secondary",
};

export default function OrgsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", adminEmail: "", adminName: "", timezone: "Pacific/Honolulu" });
  const [saving, setSaving] = useState(false);

  function loadOrgs() {
    setLoading(true);
    fetch("/api/platform/orgs")
      .then((r) => r.json())
      .then(setOrgs)
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadOrgs(); }, []);

  async function createOrg() {
    if (!form.name.trim() || !form.slug.trim() || !form.adminEmail.trim() || !form.adminName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/platform/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        showError(data.error || "Failed");
      } else {
        setShowCreate(false);
        setForm({ name: "", slug: "", adminEmail: "", adminName: "", timezone: "Pacific/Honolulu" });
        showSuccess("Organization created. Invite email sent.");
        loadOrgs();
      }
    } catch {
      showError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(orgId: string, status: string) {
    const action = status === "SUSPENDED" ? "suspend" : "reactivate";
    if (!confirm(`Are you sure you want to ${action} this organization?`)) return;
    await fetch(`/api/platform/orgs/${orgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadOrgs();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Organizations</h1>
        <Button onClick={() => setShowCreate(!showCreate)} variant={showCreate ? "outline" : "default"}>
          {showCreate ? "Cancel" : (<><Plus className="h-4 w-4 mr-1" /> Create Organization</>)}
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">New Organization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Company Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Slug *</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Admin Name *</Label>
                <Input
                  value={form.adminName}
                  onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Admin Email *</Label>
                <Input
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                />
              </div>
            </div>
            <Button
              onClick={createOrg}
              disabled={saving || !form.name.trim() || !form.slug.trim() || !form.adminEmail.trim() || !form.adminName.trim()}
            >
              {saving ? "Creating..." : "Create & Send Invite"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Org list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-md" />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="text-right">Jobs</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <Link href={`/platform/orgs/${org.id}`} className="text-sm font-medium text-primary hover:underline">
                      {org.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{org.slug}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[org.status] || "secondary"}>
                      {org.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {org.subscription?.plan?.name ?? "None"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{org._count.users}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{org._count.jobs}</TableCell>
                  <TableCell className="text-right">
                    {org.status === "SUSPENDED" ? (
                      <Button variant="ghost" size="sm" onClick={() => updateStatus(org.id, "ACTIVE")} className="text-green-400 hover:text-green-300">
                        Reactivate
                      </Button>
                    ) : org.status !== "CANCELED" ? (
                      <Button variant="ghost" size="sm" onClick={() => updateStatus(org.id, "SUSPENDED")} className="text-destructive">
                        Suspend
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
