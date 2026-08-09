"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { SectionHeader } from "@/components/admin/section-header";
import { QueueMetricsRow } from "@/components/hospital/queue-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api/errors";
import { adminApi } from "@/lib/api/admin";
import { formatDateTime } from "@/lib/utils";
import type { AdminOverview } from "@/types/admin";

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const overview = await adminApi.overview();
        if (active) setData(overview);
      } catch (err) {
        if (active) {
          setData(null);
          setError(getApiErrorMessage(err, "Unable to load admin overview."));
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const metrics = data
    ? [
        { label: "Active visits", value: String(data.active_visits) },
        { label: "Open emergencies", value: String(data.open_emergencies_count) },
        { label: "Today appointments", value: String(data.todays_appointments) },
        {
          label: "Workstations online",
          value: `${data.workstations_online}/${data.workstations_total}`,
        },
      ]
    : [];

  return (
    <AdminShell title="Administration" subtitle="Command center for clinic operations">
      <div className="space-y-6">
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        {loading && !data ? (
          <div className="h-24 animate-pulse rounded-xl bg-slate-200/70" aria-busy="true" />
        ) : (
          <QueueMetricsRow items={metrics} />
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <SectionHeader title="Queue depths" description="Waiting and in-progress counts by stage." />
            <ul className="space-y-2">
              {Object.entries(data?.queue_by_stage ?? {}).length === 0 ? (
                <li className="text-sm text-slate-500">No active queue entries.</li>
              ) : (
                Object.entries(data?.queue_by_stage ?? {}).map(([stage, counts]) => (
                  <li key={stage} className="flex items-center justify-between gap-3 text-sm">
                    <span className="capitalize text-slate-700">{stage.replaceAll("_", " ")}</span>
                    <span className="text-slate-500">
                      {counts.waiting} waiting · {counts.in_progress} active
                    </span>
                  </li>
                ))
              )}
            </ul>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/hospital/admin/ops">Open live ops</Link>
            </Button>
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <SectionHeader title="Open emergencies" description="Events still triggered or dispatched." />
            <ul className="divide-y divide-[var(--border)]">
              {(data?.open_emergencies ?? []).length === 0 ? (
                <li className="py-2 text-sm text-slate-500">No open emergencies.</li>
              ) : (
                data?.open_emergencies.map((event) => (
                  <li key={event.id} className="py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">{event.student}</p>
                      <Badge variant="secondary">{event.status}</Badge>
                    </div>
                    <p className="mt-1 text-slate-600">{event.description || "No description"}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatDateTime(event.created_at)}</p>
                  </li>
                ))
              )}
            </ul>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/hospital/admin/emergencies">Manage emergencies</Link>
            </Button>
          </section>
        </div>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <SectionHeader title="Recent audit" description="Latest immutable activity across the clinic." />
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {(data?.recent_audit ?? []).length === 0 ? (
              <li className="px-5 py-6 text-sm text-slate-500">No audit events yet.</li>
            ) : (
              data?.recent_audit.map((log) => (
                <li key={log.id} className="px-5 py-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{log.action}</p>
                    <Badge variant="secondary">{log.entity_type}</Badge>
                  </div>
                  <p className="mt-1 text-slate-600">
                    Actor: {log.performed_by ?? "system"} · Workstation: {log.workstation_name || "-"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{formatDateTime(log.created_at)}</p>
                </li>
              ))
            )}
          </ul>
          <div className="px-5 py-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/hospital/admin/audit">View full audit trail</Link>
            </Button>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
