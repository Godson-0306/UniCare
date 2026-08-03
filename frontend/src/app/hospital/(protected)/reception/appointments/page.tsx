"use client";

import { CalendarDays, ClipboardList } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api/errors";
import { apiClient } from "@/lib/api/client";
import { HOSPITAL_NAV } from "@/lib/hospital/nav-config";
import { formatDateTime } from "@/lib/utils";

interface AppointmentItem {
  id: string;
  title: string;
  department: string;
  scheduled_at: string;
  status: string;
  notes: string;
  student_name: string;
  matric_number: string;
  visit_number?: string | null;
}

const initialForm = {
  matric_number: "",
  title: "Clinic Appointment",
  department: "",
  scheduled_at: "",
  notes: "",
  status: "scheduled",
  visit_id: "",
};

export default function ReceptionAppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  async function loadAppointments(showLoading = true) {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const { data } = await apiClient.get(`/appointments/${suffix}`);
      if (data.success) setAppointments(data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load appointments."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const { data } = await apiClient.get("/appointments/");
        if (data.success) setAppointments(data.data);
      } catch (err) {
        setError(getApiErrorMessage(err, "Unable to load appointments."));
      } finally {
        setLoading(false);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function submitAppointment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatusMessage("");
    setError("");
    try {
      const payload = {
        ...form,
        visit_id: form.visit_id || null,
      };
      const { data } = await apiClient.post("/reception/appointments/", payload);
      if (data.success) {
        setForm(initialForm);
        setStatusMessage(`Appointment created for ${data.data.student_name}.`);
        await loadAppointments();
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Appointment creation failed."));
    } finally {
      setSubmitting(false);
    }
  }

  const calendarGroups = useMemo(() => {
    return appointments.reduce<Record<string, AppointmentItem[]>>((acc, appointment) => {
      const key = new Date(appointment.scheduled_at).toDateString();
      acc[key] = acc[key] ? [...acc[key], appointment] : [appointment];
      return acc;
    }, {});
  }, [appointments]);

  return (
    <DashboardShell title="Appointments" subtitle="Reception scheduling, follow-ups, and treatment-linked visits" navItems={HOSPITAL_NAV.receptionist}>
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create Appointment</CardTitle>
            <CardDescription>Supports reception bookings, follow-up links, and treatment-related scheduling.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitAppointment} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="matric_number">Matric number</Label>
                <Input id="matric_number" value={form.matric_number} onChange={(e) => setForm((c) => ({ ...c, matric_number: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} required />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" value={form.department} onChange={(e) => setForm((c) => ({ ...c, department: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    value={form.status}
                    onChange={(e) => setForm((c) => ({ ...c, status: e.target.value }))}
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="missed">Missed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="ongoing_treatment">Ongoing Treatment</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="scheduled_at">Date and time</Label>
                  <Input
                    id="scheduled_at"
                    type="datetime-local"
                    value={form.scheduled_at}
                    onChange={(e) => setForm((c) => ({ ...c, scheduled_at: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visit_id">Linked visit ID (optional)</Label>
                  <Input id="visit_id" value={form.visit_id} onChange={(e) => setForm((c) => ({ ...c, visit_id: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.notes}
                  onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Scheduling..." : "Create Appointment"}
              </Button>
            </form>
            {statusMessage && <p className="mt-4 text-sm text-teal-700">{statusMessage}</p>}
            {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Appointment Workspace</CardTitle>
                <CardDescription>List and calendar views for reception and doctor-generated schedules.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}>
                  <ClipboardList className="h-4 w-4" />
                  List
                </Button>
                <Button type="button" variant={view === "calendar" ? "default" : "outline"} onClick={() => setView("calendar")}>
                  <CalendarDays className="h-4 w-4" />
                  Calendar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
              <Input placeholder="Search by student or title" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="missed">Missed</option>
                <option value="cancelled">Cancelled</option>
                <option value="ongoing_treatment">Ongoing Treatment</option>
              </select>
              <Button type="button" onClick={() => void loadAppointments(false)} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>

            {view === "list" && (
              <div className="space-y-3">
                {appointments.length === 0 && <p className="text-sm text-slate-500">No appointments found.</p>}
                {appointments.map((appointment) => (
                  <div key={appointment.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{appointment.title}</p>
                        <p className="text-sm text-slate-600">
                          {appointment.student_name} · {appointment.matric_number}
                        </p>
                        <p className="text-xs text-slate-500">
                          {appointment.department || "General"} · Status: {appointment.status}
                        </p>
                      </div>
                      <p className="text-xs text-slate-400">{formatDateTime(appointment.scheduled_at)}</p>
                    </div>
                    {(appointment.notes || appointment.visit_number) && (
                      <div className="mt-3 text-sm text-slate-600">
                        {appointment.visit_number && <p>Linked visit: {appointment.visit_number}</p>}
                        {appointment.notes && <p>{appointment.notes}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {view === "calendar" && (
              <div className="space-y-4">
                {Object.keys(calendarGroups).length === 0 && <p className="text-sm text-slate-500">No appointments to display.</p>}
                {Object.entries(calendarGroups).map(([day, dayAppointments]) => (
                  <div key={day} className="rounded-xl border border-slate-200 p-4">
                    <p className="mb-3 font-medium text-slate-900">{day}</p>
                    <div className="space-y-3">
                      {dayAppointments.map((appointment) => (
                        <div key={appointment.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                          <p className="font-medium text-slate-900">{appointment.title}</p>
                          <p className="text-slate-600">
                            {appointment.student_name} · {formatDateTime(appointment.scheduled_at)}
                          </p>
                          <p className="text-xs uppercase tracking-wide text-teal-700">{appointment.status}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
