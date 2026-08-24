"use client";

import { useState, useEffect, useCallback } from "react";

type AuditEntry = {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  actorName: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
};

type PageData = {
  logs: AuditEntry[];
  total: number;
  page: number;
  totalPages: number;
};

export function AuditLogViewer() {
  const [data, setData] = useState<PageData | null>(null);
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "30" });
    if (entity) params.set("entity", entity);
    if (action) params.set("action", action);

    try {
      const res = await fetch(`/api/org/audit-logs?${params}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, entity, action]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Entity</label>
          <select
            value={entity}
            onChange={(e) => { setEntity(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded px-3 py-1.5 text-sm"
          >
            <option value="">All</option>
            {["job", "customer", "quote", "payment", "priceItem", "truck", "dumpSite", "dumpRun", "user", "organization", "photo"].map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Action</label>
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded px-3 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="px-4 py-6 text-sm text-gray-500 text-center">Loading...</p>
        ) : !data || data.logs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500 text-center">No audit entries found.</p>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-600 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-US", {
                        month: "short", day: "numeric",
                        hour: "numeric", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {log.actorName || "System"}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        log.action === "CREATE"
                          ? "bg-green-100 text-green-700"
                          : log.action === "DELETE"
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">{log.entity}</td>
                    <td className="px-4 py-2 text-xs text-gray-400 font-mono">
                      {log.entityId.slice(0, 8)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                <span className="text-xs text-gray-500">
                  {data.total} entries — page {data.page} of {data.totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1 text-xs border border-gray-200 rounded disabled:opacity-40 hover:bg-gray-100"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    disabled={page >= data.totalPages}
                    className="px-3 py-1 text-xs border border-gray-200 rounded disabled:opacity-40 hover:bg-gray-100"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
