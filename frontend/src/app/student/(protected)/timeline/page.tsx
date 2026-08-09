"use client";

import { useEffect, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { STUDENT_NAV } from "@/lib/student/nav-config";
import { formatDateTime } from "@/lib/utils";

interface TimelineItem {
  kind: string;
  timestamp: string;
  title: string;
  status: string;
  details: Record<string, unknown>;
}

function detailEntries(details: Record<string, unknown>) {
  return Object.entries(details)
    .filter(([, value]) => value != null && value !== "" && typeof value !== "object")
    .slice(0, 6);
}

export default function StudentTimelinePage() {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await apiClient.get("/student/timeline/");
        if (res.data.success) {
          setItems(res.data.data);
        }
      } catch (err) {
        setError(getApiErrorMessage(err, "Unable to load your medical timeline."));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <DashboardShell title="Medical Timeline" subtitle="Unified view of visits, treatment, and clinical events" navItems={STUDENT_NAV}>
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="font-display text-xl font-semibold text-slate-900">Timeline</h2>
          <p className="text-sm text-[var(--muted)]">Chronological care events across visits and results.</p>
        </div>

        <div className="px-5 py-4">
          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          {loading ? <div className="h-28 animate-pulse rounded-xl bg-slate-200/70" aria-busy="true" /> : null}
          {!loading && items.length === 0 ? <p className="text-sm text-slate-500">No timeline events available.</p> : null}

          <ol className="relative space-y-0">
            {items.map((item, index) => (
              <li key={`${item.kind}-${index}`} className="relative border-l border-teal-200 pl-5 py-4">
                <span className="absolute -left-1.5 top-5 h-3 w-3 rounded-full bg-teal-600" aria-hidden />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs uppercase tracking-wide text-teal-700">{item.kind.replaceAll("_", " ")}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">{item.status}</Badge>
                    <p className="mt-1 text-xs text-slate-400">{formatDateTime(item.timestamp)}</p>
                  </div>
                </div>
                {detailEntries(item.details).length > 0 ? (
                  <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                    {detailEntries(item.details).map(([key, value]) => (
                      <div key={key} className="rounded-lg bg-slate-50 px-3 py-2">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {key.replaceAll("_", " ")}
                        </dt>
                        <dd className="mt-0.5 text-sm text-slate-800">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </section>
    </DashboardShell>
  );
}
