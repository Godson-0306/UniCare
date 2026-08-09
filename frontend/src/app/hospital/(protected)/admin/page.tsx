"use client";

import { useEffect, useState } from "react";

import { QueueMetricsRow } from "@/components/hospital/queue-chrome";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api/client";
import { HOSPITAL_NAV } from "@/lib/hospital/nav-config";
import { formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

type NamedCount = { name?: string; label?: string; count?: number; value?: number; total?: number };

function asList(value: unknown): NamedCount[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (item && typeof item === "object" ? (item as NamedCount) : { name: String(item) }));
}

function itemLabel(item: NamedCount) {
  return item.name || item.label || "Item";
}

function itemValue(item: NamedCount) {
  return item.count ?? item.value ?? item.total ?? 0;
}

function AnalyticsSection({ title, items }: { title: string; items: NamedCount[] }) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <h3 className="text-sm font-semibold capitalize text-slate-900">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">No data yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.slice(0, 8).map((item, index) => (
            <li key={`${itemLabel(item)}-${index}`} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-slate-700">{itemLabel(item)}</span>
              <Badge variant="secondary">{itemValue(item)}</Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function HospitalAdminPage() {
  const { workstation, user } = useAuthStore();
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [analyticsRes, logsRes] = await Promise.all([
          apiClient.get("/audit/analytics/"),
          apiClient.get("/audit/logs/"),
        ]);
        if (analyticsRes.data.success) setAnalytics(analyticsRes.data.data);
        if (logsRes.data.success) setLogs(logsRes.data.data);
      } catch {
        setAnalytics(null);
        setLogs([]);
        setError("Unable to load administration analytics right now.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const totals = (analytics?.totals as Record<string, number> | undefined) ?? {};
  const metricItems = Object.entries(totals).map(([key, value]) => ({
    label: key.replaceAll("_", " "),
    value: String(value),
  }));

  return (
    <DashboardShell
      title="Administration"
      subtitle={`System oversight · ${workstation?.station_name ?? user?.username}`}
      navItems={HOSPITAL_NAV[user?.role ?? "admin"]}
    >
      <div className="space-y-6">
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="h-24 animate-pulse rounded-xl bg-slate-200/70" aria-busy="true" />
        ) : metricItems.length > 0 ? (
          <QueueMetricsRow items={metricItems.slice(0, 5)} />
        ) : (
          <p className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
            No analytics totals available yet.
          </p>
        )}

        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900">Operational summaries</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Visits, diagnostics, pharmacy, and emergency patterns across the clinic.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {(
              [
                ["most_common_diagnoses", "Most common diagnoses"],
                ["pharmacy_usage_trends", "Pharmacy usage trends"],
                ["lab_test_frequency", "Lab test frequency"],
                ["emergency_case_frequency", "Emergency case frequency"],
                ["doctor_workload_distribution", "Doctor workload distribution"],
              ] as const
            ).map(([key, title]) => (
              <AnalyticsSection key={key} title={title} items={asList(analytics?.[key])} />
            ))}
          </div>
        </div>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="font-display text-xl font-semibold text-slate-900">Audit logs</h2>
            <p className="text-sm text-[var(--muted)]">Immutable activity trail for patient and workstation access</p>
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {logs.length === 0 ? (
              <li className="px-5 py-6 text-sm text-slate-500">No audit events yet.</li>
            ) : (
              logs.slice(0, 25).map((log) => (
                <li key={String(log.id)} className="px-5 py-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{String(log.action)}</p>
                    <Badge variant="secondary">{String(log.entity_type)}</Badge>
                  </div>
                  <p className="mt-1 text-slate-600">
                    Actor: {String(log.performed_by ?? "system")} · Workstation: {String(log.workstation_name ?? "-")}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{formatDateTime(String(log.created_at))}</p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </DashboardShell>
  );
}
