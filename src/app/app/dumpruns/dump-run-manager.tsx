"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCents } from "@/lib/format";

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
  const [message, setMessage] = useState<string | null>(null);
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
    setMessage(null);
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
        setMessage(data.error || "Failed");
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
        router.refresh();
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRun(id: string) {
    if (!confirm("Delete this dump run?")) return;
    const res = await fetch(`/api/org/dumpruns/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
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
        <button
          onClick={() => setShowForm(true)}
          disabled={trucks.length === 0 || dumpSites.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300"
        >
          {trucks.length === 0 || dumpSites.length === 0
            ? "Add trucks & dump sites first"
            : "Log Dump Run"}
        </button>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-medium text-gray-700">New Dump Run</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Truck *</label>
              <select
                value={form.truckId}
                onChange={(e) => setForm({ ...form, truckId: e.target.value })}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm"
              >
                {trucks.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Dump Site *</label>
              <select
                value={form.dumpSiteId}
                onChange={(e) => setForm({ ...form, dumpSiteId: e.target.value })}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm"
              >
                {dumpSites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date/Time *</label>
              <input
                type="datetime-local"
                value={form.runAt}
                onChange={(e) => setForm({ ...form, runAt: e.target.value })}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Weight (lbs)</label>
              <input
                type="number"
                step="1"
                value={form.weightLbs}
                onChange={(e) => setForm({ ...form, weightLbs: e.target.value })}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fee ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.feeCents}
                onChange={(e) => setForm({ ...form, feeCents: e.target.value })}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          {/* Link jobs */}
          {recentJobs.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Link Jobs</label>
              <div className="flex flex-wrap gap-2">
                {recentJobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => toggleJob(job.id)}
                    className={`px-2 py-1 rounded text-xs font-medium border ${
                      form.jobIds.includes(job.id)
                        ? "bg-blue-100 border-blue-300 text-blue-700"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    #{job.jobNumber}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={createRun}
              disabled={saving}
              className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium disabled:bg-gray-300 hover:bg-blue-700"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => { setShowForm(false); setMessage(null); }}
              className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            {message && <span className="text-sm text-red-600">{message}</span>}
          </div>
        </div>
      )}

      {/* Runs list */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {initialRuns.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500 text-center">No dump runs yet.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Truck</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dump Site</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Weight</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Fee</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jobs</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {initialRuns.map((run) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {new Date(run.runAt).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                      hour: "numeric", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{run.truck.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{run.dumpSite.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                    {run.weightLbs ? `${run.weightLbs} lbs` : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                    {run.feeCents ? formatCents(run.feeCents) : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {run.dumpRunJobs.length > 0
                      ? run.dumpRunJobs.map((drj) => `#${drj.job.jobNumber}`).join(", ")
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <button
                      onClick={() => deleteRun(run.id)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
