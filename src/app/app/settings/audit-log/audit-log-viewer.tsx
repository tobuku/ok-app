"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
          <Label className="text-xs text-muted-foreground mb-1">Entity</Label>
          <select
            value={entity}
            onChange={(e) => { setEntity(e.target.value); setPage(1); }}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All</option>
            {["job", "customer", "quote", "payment", "priceItem", "truck", "dumpSite", "dumpRun", "user", "organization", "photo"].map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1">Action</Label>
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : !data || data.logs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">No audit entries found.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="px-4 text-xs uppercase">Time</TableHead>
                  <TableHead className="px-4 text-xs uppercase">User</TableHead>
                  <TableHead className="px-4 text-xs uppercase">Action</TableHead>
                  <TableHead className="px-4 text-xs uppercase">Entity</TableHead>
                  <TableHead className="px-4 text-xs uppercase">ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-US", {
                        month: "short", day: "numeric",
                        hour: "numeric", minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="px-4 py-2 text-sm text-foreground">
                      {log.actorName || "System"}
                    </TableCell>
                    <TableCell className="px-4 py-2 text-sm">
                      <Badge
                        variant={
                          log.action === "CREATE"
                            ? "success"
                            : log.action === "DELETE"
                            ? "destructive"
                            : "info"
                        }
                      >
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-2 text-sm text-muted-foreground">{log.entity}</TableCell>
                    <TableCell className="px-4 py-2 text-xs text-muted-foreground font-mono">
                      {log.entityId.slice(0, 8)}...
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {data.total} entries — page {data.page} of {data.totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    disabled={page >= data.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
