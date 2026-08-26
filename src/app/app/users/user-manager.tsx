"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showSuccess, showError } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  active: boolean;
  invitedAt: string | null;
  createdAt: string;
};

const ROLES = ["LEADMAN", "DISPATCHER", "ORG_ADMIN"] as const;

export function UserManager({
  initialUsers,
  currentUserId,
}: {
  initialUsers: User[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "LEADMAN" });
  const [saving, setSaving] = useState(false);

  async function inviteUser() {
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/org/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        showError(data.error || "Failed to invite user");
      } else {
        showSuccess("Team member added");
        setShowForm(false);
        setForm({ name: "", email: "", phone: "", role: "LEADMAN" });
        router.refresh();
      }
    } catch {
      showError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function updateUser(userId: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/org/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) router.refresh();
  }

  async function toggleActive(u: User) {
    if (u.id === currentUserId) return;
    const action = u.active ? "deactivate" : "reactivate";
    if (!confirm(`Are you sure you want to ${action} ${u.name}?`)) return;
    await updateUser(u.id, { active: !u.active });
  }

  return (
    <div className="space-y-4">
      {!showForm ? (
        <Button onClick={() => setShowForm(true)}>
          Add Team Member
        </Button>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">New Team Member</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="user-name" className="text-xs text-muted-foreground">Name *</Label>
                <Input
                  id="user-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="user-email" className="text-xs text-muted-foreground">Email *</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="user-phone" className="text-xs text-muted-foreground">Phone</Label>
                <Input
                  id="user-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="user-role" className="text-xs text-muted-foreground">Role *</Label>
                <select
                  id="user-role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={inviteUser}
                disabled={saving || !form.name.trim() || !form.email.trim()}
                size="sm"
              >
                {saving ? "Adding..." : "Add Member"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialUsers.map((u) => (
              <TableRow key={u.id} className={!u.active ? "opacity-50" : ""}>
                <TableCell className="font-medium">
                  {u.name}
                  {u.id === currentUserId && (
                    <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell className="text-muted-foreground">{u.phone || "-"}</TableCell>
                <TableCell>
                  {u.id === currentUserId ? (
                    <span className="text-muted-foreground">{u.role.replace("_", " ")}</span>
                  ) : (
                    <select
                      value={u.role}
                      onChange={(e) => updateUser(u.id, { role: e.target.value })}
                      className="flex h-8 rounded-md border border-input bg-background px-2 py-0.5 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r.replace("_", " ")}</option>
                      ))}
                    </select>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={u.active ? "success" : "secondary"}>
                    {u.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {u.id !== currentUserId && (
                    <Button
                      variant={u.active ? "ghost" : "ghost"}
                      size="sm"
                      onClick={() => toggleActive(u)}
                      className={
                        u.active
                          ? "text-destructive hover:text-destructive"
                          : "text-primary hover:text-primary"
                      }
                    >
                      {u.active ? "Deactivate" : "Reactivate"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
