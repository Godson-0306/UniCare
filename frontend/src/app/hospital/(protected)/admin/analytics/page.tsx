"use client";

import { useEffect, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { SectionHeader } from "@/components/admin/section-header";
import { QueueMetricsRow } from "@/components/hospital/queue-chrome";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api/errors";
import { adminApi } from "@/lib/api/admin";
import { adminAnalyticsSchema } from "@/lib/admin/schemas";
import type { AdminAnalytics, AdminNamedTotal } from "@/types/admin";

function seriesLabel(item: AdminNamedTotal) {
  return item.diagnosis || item.test_name || item.username || item.day || "Item";
}

function AnalyticsSection({ title, items }: { title: string; items: AdminNamedTotal[] }) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">No data yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.slice(0, 10).map((item, index) => (
            <li key={`${seriesLabel(item)}-${index}`} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-slate-700">{seriesLabel(item)}</span>
              <Badge variant="secondary">{item.total}</Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(14);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const raw = await adminApi.analytics(days);
        const parsed = adminAnalyticsSchema.parse(raw);
        if (active) setAnalytics(parsed);
      } catch (err) {
        if (active) {
          setAnalytics(null);
          setError(getApiErrorMessage(err, "Unable to load analytics."));
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [days]);

  const metrics = analytics
    ? Object.entries(analytics.totals).map(([key, value]) => ({
        label: key.replaceAll("_", " "),
        value: String(value),
      }))
    : [];

  return (
    <AdminShell title="Analytics" subtitle="Clinic volume, diagnostics, and workload patterns">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="analytics-days">Trend window (days)</Label>
            <select
              id="analytics-days"
              className="mt-1 h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
            >
              <option value={7}>7</option>
              <option value={14}>14</option>
              <option value={30}>30</option>
              <option value={90}>90</option>
            </select>
          </div>
        </div>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="h-24 animate-pulse rounded-xl bg-slate-200/70" aria-busy="true" />
        ) : metrics.length > 0 ? (
          <QueueMetricsRow items={metrics} />
        ) : (
          <p className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
            No analytics totals available yet.
          </p>
        )}

        <div>
          <SectionHeader
            title="Operational summaries"
            description="Visits, diagnostics, pharmacy, and emergency patterns across the clinic."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <AnalyticsSection title="Most common diagnoses" items={analytics?.most_common_diagnoses ?? []} />
            <AnalyticsSection title="Pharmacy usage trends" items={analytics?.pharmacy_usage_trends ?? []} />
            <AnalyticsSection title="Lab test frequency" items={analytics?.lab_test_frequency ?? []} />
            <AnalyticsSection title="Emergency case frequency" items={analytics?.emergency_case_frequency ?? []} />
            <AnalyticsSection
              title="Doctor workload distribution"
              items={analytics?.doctor_workload_distribution ?? []}
            />
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
