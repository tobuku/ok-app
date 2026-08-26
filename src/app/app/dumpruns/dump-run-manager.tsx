"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCents } from "@/lib/format";
import { showSuccess, showError } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DumpRun = {
  id: string;
  runAt: string;
  weightLbs: number | null;
  feeCents: number | null;
  notes: string | null;
  truck: { id: string; name: string };
  dumpSite: { id: string; name: string };
  dumpRunJobs: { job: { id: string; jobNumber: number } }[];
};

type Option = { id: string; name: string };
type JobOption = { id: string; jobNumber: number };

export function DumpRunManager({
  initialRuns,
  trucks,
  dumpSites,
  recentJobs,
}: {
  initialRuns: DumpRun[];
  trucks: Option[];
  dumpSites: Option[];
  recentJobs: JobOption[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    truckId: trucks[0]?.id || "",
    dumpSiteId: dumpSites[0]?.id || "",
    runAt: new Date().toISOString().slice(0, 16),
    weightLbs: "",
    feeCents: "",
    notes: "",
    jobIds: [] as string[],
  });

  async function createRun() {
    if (!form.truckId || !form.dumpSiteId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/org/dumpruns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          weightLbs: form.weightLbs ? parseFloat(form.weightLbs) : null,
          feeCents: form.feeCents ? Math.round(parseFloat(form.feeCents) * 100) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        showError(data.error || "Failed");
      } else {
        setShowForm(false);
        setForm({
          truckId: trucks[0]?.id || "",
          dumpSiteId: dumpSites[0]?.id || "",
          runAt: new Date().toISOString().slice(0, 16),
          weightLbs: "",
          feeCents: "",
          notes: "",
          jobIds: [],
        });
        showSuccess("Dump run logged");
        router.refresh();
      }
    } catch {
      showError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRun(id: string) {
    if (!confirm("Delete this dump run?")) return;
    const res = await fetch(`/api/org/dumpruns/${id}`, { method: "DELETE" });
    if (res.ok) {
      showSuccess("Dump run deleted");
      router.refresh();
    } else {
      showError("Failed to delete dump run");
    }
  }

  function toggleJob(jobId: string) {
    setForm((prev) => ({
      ...prev,
      jobIds: prev.jobIds.includes(jobId)
        ? prev.jobIds.filter((j) => j !== jobId)
        : [...prev.jobIds, jobId],
    }));
  }

  return (
    <div className="space-y-4">
      {/* Create form */}
      {!showForm ? (
        <Button
          onClick={() => setShowForm(true)}
          disabled={trucks.length === 0 || dumpSites.length === 0}
        >
          {trucks.length === 0 || dumpSites.length === 0
            ? "Add trucks & dump sites first"
            : "Log Dump Run"}
        </Button>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">New Dump Run</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Truck *</Label>
                <select
                  value={form.truckId}
                  onChange={(e) => setForm({ ...form, truckId: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1"
                >
                  {trucks.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Dump Site *</Label>
                <select
                  value={form.dumpSiteId}
                  onChange={(e) => setForm({ ...form, dumpSiteId: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1"
                >
                  {dumpSites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Date/Time *</Label>
                <Input
                  type="datetime-local"
                  value={form.runAt}
                  onChange={(e) => setForm({ ...form, runAt: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Weight (lbs)</Label>
                <Input
                  type="number"
                  step="1"
                  value={form.weightLbs}
                  onChange={(e) => setForm({ ...form, weightLbs: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fee ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.feeCents}
                  onChange={(e) => setForm({ ...form, feeCents: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Link jobs */}
            {recentJobs.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Link Jobs</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {recentJobs.map((job) => (
                    <Button
                      key={job.id}
                      type="button"
                      variant={form.jobIds.includes(job.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleJob(job.id)}
                      className="text-xs h-7"
                    >
                      #{job.jobNumber}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button
                onClick={createRun}
                disabled={saving}
                size="sm"
              >
                {saving ? "Saving..." : "Save"}
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

      {/* Runs list */}
      <Card>
        {initialRuns.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">No dump runs yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4 text-xs uppercase">Date</TableHead>
                <TableHead className="px-4 text-xs uppercase">Truck</TableHead>
                <TableHead className="px-4 text-xs uppercase">Dump Site</TableHead>
                <TableHead className="px-4 text-xs uppercase text-right">Weight</TableHead>
                <TableHead className="px-4 text-xs uppercase text-right">Fee</TableHead>
                <TableHead className="px-4 text-xs uppercase">Jobs</TableHead>
                <TableHead className="px-4 text-xs uppercase text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialRuns.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="px-4 py-3 text-foreground">
                    {new Date(run.runAt).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                      hour: "numeric", minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">{run.truck.name}</TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">{run.dumpSite.name}</TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground text-right">
                    {run.weightLbs ? `${run.weightLbs} lbs` : "-"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-foreground text-right font-medium">
                    {run.feeCents ? formatCents(run.feeCents) : "-"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">
                    {run.dumpRunJobs.length > 0
                      ? run.dumpRunJobs.map((drj) => `#${drj.job.jobNumber}`).join(", ")
                      : "-"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => deleteRun(run.id)}
                      className="text-xs text-destructive h-auto p-0 hover:text-destructive/80"
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
