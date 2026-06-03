"use client";

import { ArrowLeft, CalendarDays, Loader2, RefreshCcw, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useEffectEvent, useMemo, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { HOSPITAL_NAV } from "@/lib/hospital/nav-config";
import { getNotificationsWebSocketUrl } from "@/lib/realtime";
import { formatDateTime } from "@/lib/utils";

interface Appointment {
  id: string;
  title: string;
  department: string;
  scheduled_at: string;
  status: "scheduled" | "completed" | "cancelled" | "missed" | "ongoing_treatment";
  notes: string;
  student_name: string;
  matric_number: string;
  visit_number?: string | null;
  created_by?: string | null;
  created_at: string;
}

function statusVariant(status: Appointment["status"]) {
  if (status === "completed") return "default" as const;
  if (status === "cancelled" || status === "missed") return "destructive" as const;
  if (status === "ongoing_treatment") return "warning" as const;
  return "secondary" as const;
}

export default function DoctorFollowUpsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Appointment["status"] | "">("");
  const [error, setError] = useState("");

  async function loadFollowUps(showLoading = true) {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (query.trim()) params.set("search", query.trim());
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const { data } = await apiClient.get(`/appointments/${suffix}`);
      if (data.success) {
        setAppointments(
          (data.data as Appointment[]).filter((appointment) =>
            `${appointment.title} ${appointment.notes}`.toLowerCase().includes("follow")
          )
        );
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load doctor follow-ups."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const refreshFollowUps = useEffectEvent((showLoading = false) => {
    void loadFollowUps(showLoading);
  });

  useEffect(() => {
    const timer = window.setTimeout(() => refreshFollowUps(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const socketUrl = getNotificationsWebSocketUrl();
    if (!socketUrl) return;
    const socket = new WebSocket(socketUrl);
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { event?: string };
      if (payload.event?.startsWith("appointment.") || payload.event === "notification.created") {
        refreshFollowUps(false);
      }
    };
    return () => socket.close();
  }, []);

  const filteredAppointments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return appointments;
    return appointments.filter((appointment) =>
      [appointment.student_name, appointment.matric_number, appointment.title, appointment.visit_number]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [appointments, query]);

  return (
    <DashboardShell title="Doctor Follow-ups" subtitle="Follow-up appointment management" navItems={HOSPITAL_NAV.doctor} hideSidebar>
      <div className="space-y-6">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Follow-up Management</p>
            <h2 className="text-2xl font-semibold text-slate-950">Scheduled Follow-ups</h2>
            <p className="text-sm text-slate-500">Appointments created from consultation follow-up plans.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href="/hospital/doctor"><ArrowLeft className="h-4 w-4" /> Back to Queue</Link></Button>
            <Button type="button" variant="outline" onClick={() => void loadFollowUps(false)} disabled={refreshing || loading}>
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </header>

        <Card>
          <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" placeholder="Search by name, matric number, visit ID, or title" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as Appointment["status"] | "")}>
              <option value="">All statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="ongoing_treatment">Ongoing Treatment</option>
              <option value="completed">Completed</option>
              <option value="missed">Missed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </CardContent>
        </Card>

        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {loading && <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading follow-ups...</p>}
        {!loading && filteredAppointments.length === 0 && <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">No follow-up appointments found.</p>}

        <section className="grid gap-4 xl:grid-cols-2">
          {filteredAppointments.map((appointment) => (
            <Card key={appointment.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-teal-700" /> {appointment.student_name}</CardTitle>
                    <CardDescription>{appointment.matric_number} · {appointment.visit_number || "No visit linked"}</CardDescription>
                  </div>
                  <Badge variant={statusVariant(appointment.status)}>{appointment.status.replaceAll("_", " ")}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Info label="Scheduled" value={formatDateTime(appointment.scheduled_at)} />
                <Info label="Title" value={appointment.title} />
                <Info label="Notes" value={appointment.notes || "No follow-up notes recorded."} />
                <Info label="Created By" value={appointment.created_by || "Clinical Services"} />
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </DashboardShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-line text-slate-900">{value}</p>
    </div>
  );
}
