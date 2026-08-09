"use client";

import { useEffect, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { SectionHeader } from "@/components/admin/section-header";
import { QueueMetricsRow } from "@/components/hospital/queue-chrome";
import { Badge } from "@/components/ui/badge";
import { getApiErrorMessage } from "@/lib/api/errors";
import { adminApi } from "@/lib/api/admin";
import { formatDateTime } from "@/lib/utils";
import type { AdminOpsQueues } from "@/types/admin";

export default function AdminOpsPage() {
  const [data, setData] = useState<AdminOpsQueues | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const ops = await adminApi.opsQueues();
        if (active) setData(ops);
      } catch (err) {
        if (active) setError(getApiErrorMessage(err, "Unable to load live ops."));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 20000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const metrics =
    data?.stages.map((stage) => ({
      label: stage.stage,
      value: String(stage.waiting + stage.in_progress),
    })) ?? [];

  return (
    <AdminShell title="Live ops" subtitle="Read-only queue oversight across clinical stages">
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
          {(data?.stages ?? []).map((stage) => (
            <section key={stage.stage} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <SectionHeader
                title={stage.stage.replaceAll("_", " ")}
                description={`${stage.waiting} waiting · ${stage.in_progress} in progress`}
              />
              <ul className="divide-y divide-[var(--border)]">
                {stage.oldest_waiting.length === 0 ? (
                  <li className="py-2 text-sm text-slate-500">Queue clear.</li>
                ) : (
                  stage.oldest_waiting.map((entry) => (
                    <li key={entry.entry_id} className="py-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900">{entry.student_name}</p>
                        <Badge variant="secondary">{entry.priority}</Badge>
                      </div>
                      <p className="mt-1 text-slate-600">
                        {entry.visit_number} · {entry.matric_number} · pos {entry.position}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">{formatDateTime(entry.created_at)}</p>
                    </li>
                  ))
                )}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
