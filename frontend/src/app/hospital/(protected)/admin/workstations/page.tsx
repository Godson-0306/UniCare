"use client";

import { useEffect, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { PasswordReveal } from "@/components/admin/password-reveal";
import { SectionHeader } from "@/components/admin/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WORKSTATION_ROLES } from "@/lib/admin/schemas";
import { getApiErrorMessage } from "@/lib/api/errors";
import { adminApi } from "@/lib/api/admin";
import { formatDateTime } from "@/lib/utils";
import type { AdminWorkstation } from "@/types/admin";

const emptyForm = {
  username: "",
  station_name: "",
  station_code: "",
  assigned_role: "receptionist",
  location: "",
};

export default function AdminWorkstationsPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [items, setItems] = useState<AdminWorkstation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.workstations({ q, role: role || undefined, limit: 100 });
      setItems(data.items);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load workstations."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, role]);

  async function createWorkstation(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setStatusMessage("");
    try {
      const created = await adminApi.createWorkstation(form);
      setTempPassword(created.temporary_password || "");
      setForm(emptyForm);
      setStatusMessage(`Provisioned ${created.station_name}.`);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to create workstation."));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(station: AdminWorkstation) {
    try {
      await adminApi.updateWorkstation(station.id, { is_active: !station.is_active });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to update workstation."));
    }
  }

  async function resetPassword(station: AdminWorkstation) {
    try {
      const result = await adminApi.resetWorkstationPassword(station.id);
      setTempPassword(result.temporary_password);
      setStatusMessage(`Password rotated for ${station.station_name}.`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to reset password."));
    }
  }

  return (
    <AdminShell title="Workstations" subtitle="Provision and manage hospital station accounts">
      <div className="space-y-6">
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        {statusMessage ? (
          <p className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">{statusMessage}</p>
        ) : null}
        {tempPassword ? <PasswordReveal password={tempPassword} onDismiss={() => setTempPassword("")} /> : null}

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <SectionHeader title="Provision workstation" description="Creates login + station profile with managed_by set to you." />
            <form className="space-y-3" onSubmit={createWorkstation}>
              <div>
                <Label htmlFor="station-name">Station name</Label>
                <Input id="station-name" required value={form.station_name} onChange={(e) => setForm({ ...form, station_name: e.target.value })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value, station_code: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="code">Station code</Label>
                  <Input id="code" required value={form.station_code} onChange={(e) => setForm({ ...form, station_code: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="role">Assigned role</Label>
                <select
                  id="role"
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  value={form.assigned_role}
                  onChange={(e) => setForm({ ...form, assigned_role: e.target.value })}
                >
                  {WORKSTATION_ROLES.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <Button type="submit" disabled={submitting}>{submitting ? "Provisioning…" : "Provision station"}</Button>
            </form>
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="space-y-3 border-b border-[var(--border)] px-5 py-4">
              <SectionHeader title="Stations" description="Active and inactive hospital workstations" />
              <div className="flex flex-wrap gap-3">
                <Input className="max-w-xs" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search stations…" />
                <select
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="">All roles</option>
                  {WORKSTATION_ROLES.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>
            </div>
            {loading ? (
              <div className="h-40 animate-pulse bg-slate-100" aria-busy="true" />
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {items.length === 0 ? (
                  <li className="px-5 py-6 text-sm text-slate-500">No workstations found.</li>
                ) : (
                  items.map((station) => (
                    <li key={station.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 text-sm">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900">{station.station_name}</p>
                          <Badge variant="secondary">{station.assigned_role}</Badge>
                          {!station.is_active ? <Badge variant="secondary">inactive</Badge> : null}
                        </div>
                        <p className="mt-1 text-slate-600">
                          {station.username} · {station.location || "No location"} · Managed by {station.managed_by_username || "-"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Last login: {station.last_login_at ? formatDateTime(station.last_login_at) : "Never"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => void toggleActive(station)}>
                          {station.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => void resetPassword(station)}>
                          Rotate password
                        </Button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
