"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Bell, Calendar, FileText, FlaskConical, History, Phone } from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import WelcomeCard from "@/components/student/WelcomeCard";
import { apiClient } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { STUDENT_NAV } from "@/lib/student/nav-config";
import type { ApiResponse } from "@/types/api";
import { useAuthStore } from "@/stores/auth-store";
import type { StudentProfile } from "@/types/auth";

interface MedicalProfileData extends Partial<StudentProfile> {
  student?: Partial<StudentProfile> & {
    medical_notes?: string;
  };
}

interface VisitSummary {
  registered_at: string;
}

const ACTIONS = [
  { label: "Medical History", href: "/student/medical-history", icon: History },
  { label: "Prescriptions", href: "/student/prescriptions", icon: FileText },
  { label: "Lab Results", href: "/student/lab-results", icon: FlaskConical },
  { label: "Appointments", href: "/student/appointments", icon: Calendar },
  { label: "Notifications", href: "/student/notifications", icon: Bell },
  { label: "Contact Center", href: "/student/contact", icon: Phone },
] as const;

export default function StudentDashboardPage() {
  const authProfile = useAuthStore((s) => s.profile);
  const [profile, setProfile] = useState<MedicalProfileData | null>(authProfile ?? null);
  const [lastVisit, setLastVisit] = useState<string | null>(null);
  const [stats, setStats] = useState({ prescriptions: 0, labResults: 0, appointments: 0, unread: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [rx, lab, appt, notif, medProfileRes, visitsRes] = await Promise.all([
          apiClient.get<ApiResponse<unknown[]>>("/student/prescriptions/"),
          apiClient.get<ApiResponse<unknown[]>>("/student/lab-results/"),
          apiClient.get<ApiResponse<unknown[]>>("/student/appointments/"),
          apiClient.get<ApiResponse<{ is_read: boolean }[]>>("/student/notifications/"),
          apiClient.get<ApiResponse<MedicalProfileData>>("/student/medical-profile/"),
          apiClient.get<ApiResponse<VisitSummary[]>>("/student/medical-history/"),
        ]);
        setStats({
          prescriptions: rx.data.success ? rx.data.data.length : 0,
          labResults: lab.data.success ? lab.data.data.length : 0,
          appointments: appt.data.success ? appt.data.data.length : 0,
          unread: notif.data.success ? notif.data.data.filter((n) => !n.is_read).length : 0,
        });
        if (medProfileRes.data.success) {
          setProfile(medProfileRes.data.data);
        }
        if (visitsRes.data.success && Array.isArray(visitsRes.data.data) && visitsRes.data.data.length > 0) {
          const sorted = visitsRes.data.data
            .slice()
            .sort((a, b) => new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime());
          setLastVisit(new Date(sorted[0].registered_at).toLocaleString());
        }
      } catch (err) {
        setError(getApiErrorMessage(err, "Unable to load your dashboard right now."));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <DashboardShell title="Student Portal" subtitle="Your health records at a glance" navItems={STUDENT_NAV}>
      <div className="space-y-8">
        <Link
          href="/student/emergency"
          className="group flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-red-100 text-red-700 animate-unicare-pulse-soft">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-red-900">Need emergency help?</p>
              <p className="text-xs text-red-700">Open the emergency bypass for priority clinic assistance.</p>
            </div>
          </div>
          <span className="text-sm font-medium text-red-800 group-hover:underline">Request help</span>
        </Link>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="space-y-4" aria-busy="true" aria-live="polite">
            <div className="h-36 animate-pulse rounded-xl bg-slate-200/70" />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="h-20 animate-pulse rounded-xl bg-slate-200/70" />
              <div className="h-20 animate-pulse rounded-xl bg-slate-200/70" />
              <div className="h-20 animate-pulse rounded-xl bg-slate-200/70" />
            </div>
          </div>
        ) : (
          <>
            <WelcomeCard
              fullName={profile?.student?.full_name ?? profile?.full_name}
              matric={profile?.student?.matric_number ?? profile?.matric_number}
              lastVisit={lastVisit}
              summary={profile?.student?.medical_notes ?? "No notable issues recorded."}
              department={profile?.student?.department ?? profile?.department}
              faculty={profile?.student?.faculty ?? profile?.faculty}
              level={profile?.student?.level ?? profile?.level}
            />

            <section>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold text-slate-900">Your care</h2>
                  <p className="text-sm text-[var(--muted)]">Jump to records, results, and clinic contact.</p>
                </div>
                {stats.unread > 0 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/student/notifications">{stats.unread} unread alerts</Link>
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ACTIONS.map(({ label, href, icon: Icon }) => {
                  const count =
                    href === "/student/prescriptions"
                      ? stats.prescriptions
                      : href === "/student/lab-results"
                        ? stats.labResults
                        : href === "/student/appointments"
                          ? stats.appointments
                          : href === "/student/notifications"
                            ? stats.unread
                            : null;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition-colors hover:border-teal-300 hover:bg-teal-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-50 text-teal-700">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-900">{label}</span>
                        {count !== null ? (
                          <span className="block text-xs text-[var(--muted)]">{count} on file</span>
                        ) : (
                          <span className="block text-xs text-[var(--muted)]">Open</span>
                        )}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
