"use client";

import { useEffect, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { SectionHeader } from "@/components/admin/section-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api/errors";
import { adminApi } from "@/lib/api/admin";
import { formatDateTime } from "@/lib/utils";
import type { AdminAppointment } from "@/types/admin";

export default function AdminAppointmentsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [items, setItems] = useState<AdminAppointment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await adminApi.appointments({ q, status: status || undefined, limit: 100 });
        if (!active) return;
        setItems(data.items);
        setTotal(data.total);
      } catch (err) {
        if (active) setError(getApiErrorMessage(err, "Unable to load appointments."));
      } finally {
        if (active) setLoading(false);
      }
    }
    const timer = window.setTimeout(() => void load(), 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [q, status]);

  return (
    <AdminShell title="Appointments" subtitle="Clinic-wide appointment oversight">
      <div className="space-y-6">
        <section className="flex flex-wrap gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <Input className="max-w-xs" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, student, department…" />
          <select
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="scheduled">scheduled</option>
            <option value="confirmed">confirmed</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
            <option value="missed">missed</option>
            <option value="ongoing_treatment">ongoing_treatment</option>
          </select>
        </section>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <SectionHeader title="Appointments" description={`${total} matching appointments`} />
          </div>
          {loading ? (
            <div className="h-40 animate-pulse bg-slate-100" aria-busy="true" />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {items.length === 0 ? (
                <li className="px-5 py-6 text-sm text-slate-500">No appointments found.</li>
              ) : (
                items.map((appointment) => (
                  <li key={appointment.id} className="px-5 py-4 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">{appointment.title}</p>
                      <Badge variant="secondary">{appointment.status}</Badge>
                    </div>
                    <p className="mt-1 text-slate-600">
                      {appointment.student_name} · {appointment.matric_number}
                      {appointment.department ? ` · ${appointment.department}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDateTime(appointment.scheduled_at)}
                      {appointment.visit_number ? ` · visit ${appointment.visit_number}` : ""}
                      {appointment.created_by ? ` · by ${appointment.created_by}` : ""}
                    </p>
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
