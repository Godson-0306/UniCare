"use client";

import { useEffect, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { PasswordReveal } from "@/components/admin/password-reveal";
import { SectionHeader } from "@/components/admin/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api/errors";
import { adminApi } from "@/lib/api/admin";
import { useAuthStore } from "@/stores/auth-store";
import type { AdminUser } from "@/types/admin";

const emptyStudent = {
  matric_number: "",
  first_name: "",
  last_name: "",
  email: "",
  department: "",
  faculty: "",
  level: "",
  gender: "",
};

const emptyAdmin = {
  username: "",
  email: "",
  first_name: "",
  last_name: "",
  role: "admin",
};

export default function AdminUsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const isSuperAdmin = currentUser?.role === "super_admin";
  const [q, setQ] = useState("");
  const [accountType, setAccountType] = useState("student");
  const [items, setItems] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [studentForm, setStudentForm] = useState(emptyStudent);
  const [adminForm, setAdminForm] = useState(emptyAdmin);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.users({
        q,
        account_type: accountType === "all" ? undefined : accountType,
        limit: 100,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load users."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, accountType]);

  async function createStudent(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setStatusMessage("");
    setError("");
    try {
      const created = await adminApi.createUser({ account_type: "student", ...studentForm });
      setTempPassword(created.temporary_password || "");
      setStudentForm(emptyStudent);
      setStatusMessage(`Created student ${created.username}.`);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to create student."));
    } finally {
      setSubmitting(false);
    }
  }

  async function createAdmin(event: React.FormEvent) {
    event.preventDefault();
    if (!isSuperAdmin) return;
    setSubmitting(true);
    setStatusMessage("");
    setError("");
    try {
      const created = await adminApi.createUser({ account_type: "personal", ...adminForm });
      setTempPassword(created.temporary_password || "");
      setAdminForm(emptyAdmin);
      setStatusMessage(`Created admin ${created.username}.`);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to create admin."));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(user: AdminUser) {
    try {
      await adminApi.updateUser(user.id, { is_active: !user.is_active });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to update user."));
    }
  }

  async function resetPassword(user: AdminUser) {
    try {
      const result = await adminApi.resetUserPassword(user.id);
      setTempPassword(result.temporary_password);
      setStatusMessage(`Password reset for ${user.username}.`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to reset password."));
    }
  }

  return (
    <AdminShell title="Users" subtitle="Student directory and personal admin accounts">
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
          <div className="space-y-6">
            <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <SectionHeader title="Create student" description="Provisions a student login and profile." />
              <form className="space-y-3" onSubmit={createStudent}>
                <div>
                  <Label htmlFor="matric">Matric number</Label>
                  <Input id="matric" required value={studentForm.matric_number} onChange={(e) => setStudentForm({ ...studentForm, matric_number: e.target.value })} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="first">First name</Label>
                    <Input id="first" required value={studentForm.first_name} onChange={(e) => setStudentForm({ ...studentForm, first_name: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="last">Last name</Label>
                    <Input id="last" required value={studentForm.last_name} onChange={(e) => setStudentForm({ ...studentForm, last_name: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="dept">Department</Label>
                  <Input id="dept" value={studentForm.department} onChange={(e) => setStudentForm({ ...studentForm, department: e.target.value })} />
                </div>
                <Button type="submit" disabled={submitting}>{submitting ? "Creating…" : "Create student"}</Button>
              </form>
            </section>

            {isSuperAdmin ? (
              <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <SectionHeader title="Create personal admin" description="Super admin only." />
                <form className="space-y-3" onSubmit={createAdmin}>
                  <div>
                    <Label htmlFor="admin-username">Username</Label>
                    <Input id="admin-username" required value={adminForm.username} onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="admin-role">Role</Label>
                    <select
                      id="admin-role"
                      className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                      value={adminForm.role}
                      onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value })}
                    >
                      <option value="admin">admin</option>
                      <option value="super_admin">super_admin</option>
                    </select>
                  </div>
                  <Button type="submit" disabled={submitting}>Create admin</Button>
                </form>
              </section>
            ) : null}
          </div>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="space-y-3 border-b border-[var(--border)] px-5 py-4">
              <SectionHeader title="Directory" description={`${total} accounts`} />
              <div className="flex flex-wrap gap-3">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search username, email, matric…"
                  className="max-w-xs"
                />
                <select
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                >
                  <option value="student">Students</option>
                  <option value="personal">Personal admins</option>
                  <option value="workstation">Workstations</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>
            {loading ? (
              <div className="h-40 animate-pulse bg-slate-100" aria-busy="true" />
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {items.length === 0 ? (
                  <li className="px-5 py-6 text-sm text-slate-500">No users found.</li>
                ) : (
                  items.map((user) => (
                    <li key={user.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 text-sm">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900">{user.username}</p>
                          <Badge variant="secondary">{user.role}</Badge>
                          {!user.is_active ? <Badge variant="secondary">inactive</Badge> : null}
                        </div>
                        <p className="mt-1 text-slate-600">
                          {user.profile
                            ? `${user.profile.first_name} ${user.profile.last_name} · ${user.profile.department || "No department"}`
                            : `${user.first_name} ${user.last_name}`.trim() || user.account_type}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => void toggleActive(user)}>
                          {user.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => void resetPassword(user)}>
                          Reset password
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
