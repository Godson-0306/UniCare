"use client";

import { useEffect, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { SectionHeader } from "@/components/admin/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api/errors";
import { adminApi } from "@/lib/api/admin";
import { formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { AdminAuditLog } from "@/types/admin";

export default function AdminAuditPage() {
  const tokens = useAuthStore((s) => s.tokens);
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [role, setRole] = useState("");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<AdminAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState<AdminAuditLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const limit = 50;

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await adminApi.auditLogs({
          q,
          action,
          entity_type: entityType,
          role,
          offset,
          limit,
        });
        if (!active) return;
        setItems(data.items);
        setTotal(data.total);
        setHasMore(data.has_more);
      } catch (err) {
        if (active) setError(getApiErrorMessage(err, "Unable to load audit logs."));
      } finally {
        if (active) setLoading(false);
      }
    }
    const timer = window.setTimeout(() => void load(), 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [q, action, entityType, role, offset]);

  async function exportCsv() {
    const url = adminApi.auditExportUrl({ q, action, entity_type: entityType, role });
    const response = await fetch(url, {
      headers: tokens?.access ? { Authorization: `Bearer ${tokens.access}` } : {},
    });
    if (!response.ok) {
      setError("Unable to export audit logs.");
      return;
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = "audit-logs.csv";
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }

  return (
    <AdminShell title="Audit trail" subtitle="Immutable activity across patients and workstations">
      <div className="space-y-6">
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div>
              <Label htmlFor="audit-q">Search</Label>
              <Input id="audit-q" value={q} onChange={(e) => { setOffset(0); setQ(e.target.value); }} placeholder="Action, actor, entity…" />
            </div>
            <div>
              <Label htmlFor="audit-action">Action</Label>
              <Input id="audit-action" value={action} onChange={(e) => { setOffset(0); setAction(e.target.value); }} />
            </div>
            <div>
              <Label htmlFor="audit-entity">Entity type</Label>
              <Input id="audit-entity" value={entityType} onChange={(e) => { setOffset(0); setEntityType(e.target.value); }} />
            </div>
            <div>
              <Label htmlFor="audit-role">Role</Label>
              <Input id="audit-role" value={role} onChange={(e) => { setOffset(0); setRole(e.target.value); }} />
            </div>
            <div className="flex items-end">
              <Button type="button" variant="outline" onClick={() => void exportCsv()}>
                Export CSV
              </Button>
            </div>
          </div>
        </section>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <SectionHeader title="Events" description={`${total} matching records`} />
            </div>
            {loading ? (
              <div className="h-40 animate-pulse bg-slate-100" aria-busy="true" />
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {items.length === 0 ? (
                  <li className="px-5 py-6 text-sm text-slate-500">No audit events match these filters.</li>
                ) : (
                  items.map((log) => (
                    <li key={log.id}>
                      <button
                        type="button"
                        className="w-full px-5 py-4 text-left text-sm hover:bg-slate-50"
                        onClick={() => setSelected(log)}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900">{log.action}</p>
                          <Badge variant="secondary">{log.entity_type}</Badge>
                        </div>
                        <p className="mt-1 text-slate-600">
                          {log.performed_by ?? "system"} · {log.role || "-"} · {log.workstation_name || "-"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">{formatDateTime(log.created_at)}</p>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
            <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-3">
              <Button type="button" size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>
                Previous
              </Button>
              <p className="text-xs text-slate-500">
                {offset + 1}-{Math.min(offset + limit, total)} of {total}
              </p>
              <Button type="button" size="sm" variant="outline" disabled={!hasMore} onClick={() => setOffset(offset + limit)}>
                Next
              </Button>
            </div>
          </div>

          <aside className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <SectionHeader title="Detail" description="Selected event metadata" />
            {!selected ? (
              <p className="text-sm text-slate-500">Select an event to inspect metadata.</p>
            ) : (
              <div className="space-y-3 text-sm">
                <p><span className="text-slate-500">Action:</span> {selected.action}</p>
                <p><span className="text-slate-500">Entity:</span> {selected.entity_type} · {selected.entity_id}</p>
                <p><span className="text-slate-500">Actor:</span> {selected.performed_by ?? "system"}</p>
                <p><span className="text-slate-500">IP:</span> {selected.ip_address || "-"}</p>
                <p><span className="text-slate-500">When:</span> {formatDateTime(selected.created_at)}</p>
                <pre className="overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                  {JSON.stringify(selected.metadata || {}, null, 2)}
                </pre>
              </div>
            )}
          </aside>
        </section>
      </div>
    </AdminShell>
  );
}
