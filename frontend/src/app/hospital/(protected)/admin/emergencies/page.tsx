"use client";

import { useEffect, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { SectionHeader } from "@/components/admin/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api/errors";
import { adminApi } from "@/lib/api/admin";
import { formatDateTime } from "@/lib/utils";
import type { AdminEmergency } from "@/types/admin";

const OPEN_STATUSES = new Set(["triggered", "dispatched"]);

export default function AdminEmergenciesPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [items, setItems] = useState<AdminEmergency[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.emergencies({ q, status: status || undefined, limit: 100 });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load emergencies."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  async function resolveEvent(id: string) {
    setBusyId(id);
    setError("");
    try {
      await adminApi.resolveEmergency(id);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to resolve emergency."));
    } finally {
      setBusyId("");
    }
  }

  return (
    <AdminShell title="Emergencies" subtitle="Clinic-wide emergency event oversight">
      <div className="space-y-6">
        <section className="flex flex-wrap gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <Input className="max-w-xs" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student or description…" />
          <select
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="triggered">triggered</option>
            <option value="dispatched">dispatched</option>
            <option value="resolved">resolved</option>
            <option value="cancelled">cancelled</option>
          </select>
        </section>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <SectionHeader title="Emergency events" description={`${total} matching events`} />
          </div>
          {loading ? (
            <div className="h-40 animate-pulse bg-slate-100" aria-busy="true" />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {items.length === 0 ? (
                <li className="px-5 py-6 text-sm text-slate-500">No emergency events found.</li>
              ) : (
                items.map((event) => (
                  <li key={event.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 text-sm">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900">{event.student}</p>
                        <Badge variant="secondary">{event.status}</Badge>
                        {event.priority_override ? <Badge variant="secondary">priority</Badge> : null}
                      </div>
                      <p className="mt-1 text-slate-600">
                        {event.matric_number} · {event.description || "No description"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatDateTime(event.created_at)}
                        {event.assigned_workstation ? ` · ${event.assigned_workstation}` : ""}
                      </p>
                    </div>
                    {OPEN_STATUSES.has(event.status) ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyId === event.id}
                        onClick={() => void resolveEvent(event.id)}
                      >
                        {busyId === event.id ? "Resolving…" : "Resolve"}
                      </Button>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
