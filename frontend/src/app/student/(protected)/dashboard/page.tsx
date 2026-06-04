"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Bell, Calendar, FileText, FlaskConical, History, Phone } from "lucide-react";

import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api";
import WelcomeCard from "@/components/student/WelcomeCard";
import StatGrid from "@/components/student/StatGrid";
import QuickActions from "@/components/student/QuickActions";
import EmptyState from "@/components/student/EmptyState";
import { useAuthStore } from "@/stores/auth-store";

const studentNav = [
  { label: "Dashboard", href: "/student/dashboard" },
  { label: "Prescriptions", href: "/student/prescriptions" },
  { label: "Lab Results", href: "/student/lab-results" },
  { label: "Appointments", href: "/student/appointments" },
  { label: "Medical History", href: "/student/medical-history" },
  { label: "Notifications", href: "/student/notifications" },
];

export default function StudentDashboardPage() {
  const authProfile = useAuthStore((s) => s.profile);
  const setAuthProfile = useAuthStore((s) => s.setProfile);
  const [profile, setProfile] = useState<any | null>(authProfile ?? null);
  const [lastVisit, setLastVisit] = useState<string | null>(null);
  const [stats, setStats] = useState({ prescriptions: 0, labResults: 0, appointments: 0, unread: 0 });

  useEffect(() => {
    async function load() {
      try {
        const [rx, lab, appt, notif, medProfileRes, visitsRes] = await Promise.all([
          apiClient.get<ApiResponse<unknown[]>>("/student/prescriptions/"),
          apiClient.get<ApiResponse<unknown[]>>("/student/lab-results/"),
          apiClient.get<ApiResponse<unknown[]>>("/student/appointments/"),
          apiClient.get<ApiResponse<{ is_read: boolean }[]>>("/student/notifications/"),
          apiClient.get<ApiResponse<any>>("/student/medical-profile/"),
          apiClient.get<ApiResponse<any[]>>("/student/medical-history/"),
        ]);
        setStats({
          prescriptions: rx.data.success ? rx.data.data.length : 0,
          labResults: lab.data.success ? lab.data.data.length : 0,
          appointments: appt.data.success ? appt.data.data.length : 0,
          unread: notif.data.success ? notif.data.data.filter((n) => !n.is_read).length : 0,
        });
        if (medProfileRes.data.success) {
          setProfile(medProfileRes.data.data);
          try {
            setAuthProfile(medProfileRes.data.data);
          } catch {
            /* ignore if store update fails */
          }
        }
        if (visitsRes.data.success && Array.isArray(visitsRes.data.data) && visitsRes.data.data.length > 0) {
          const sorted = visitsRes.data.data
            .slice()
            .sort((a: any, b: any) => new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime());
          setLastVisit(new Date(sorted[0].registered_at).toLocaleString());
        }
      
      } catch {
        /* backend may be offline during local UI dev */
      }
    }
    load();
  }, []);

  const tiles = [
    { label: "Prescriptions", value: stats.prescriptions, href: "/student/prescriptions", icon: FileText },
    { label: "Lab Results", value: stats.labResults, href: "/student/lab-results", icon: FlaskConical },
    { label: "Appointments", value: stats.appointments, href: "/student/appointments", icon: Calendar },
    { label: "Unread Alerts", value: stats.unread, href: "/student/notifications", icon: Bell },
  ];
  return (
    <DashboardShell title="Student Portal" subtitle="Your health records at a glance" navItems={studentNav}>
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-red-800">Emergency Assistance</CardTitle>
              <CardDescription className="text-red-700">Triggers emergency dial and priority visit bypass</CardDescription>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </CardHeader>
          <CardContent>
            <Button asChild variant="destructive">
              <Link href="/student/emergency">Request Emergency Help</Link>
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <WelcomeCard
              fullName={profile?.student?.full_name ?? profile?.full_name}
              matric={profile?.student?.matric_number ?? profile?.matric_number}
              lastVisit={lastVisit}
              summary={profile?.student?.medical_notes ?? "No notable issues recorded."}
              department={profile?.student?.department ?? profile?.department}
              faculty={profile?.student?.faculty ?? profile?.faculty}
              level={profile?.student?.level ?? profile?.level}
            />

            <StatGrid tiles={tiles} />

            <QuickActions
              actions={[
                { label: "Medical History", href: "/student/medical-history", icon: History },
                { label: "Prescriptions", href: "/student/prescriptions", icon: FileText },
                { label: "Lab Results", href: "/student/lab-results", icon: FlaskConical },
                { label: "Appointments", href: "/student/appointments", icon: Calendar },
                { label: "Contact Center", href: "/student/contact", icon: Phone },
                { label: "Emergency", href: "/student/emergency", icon: AlertTriangle, variant: "destructive" },
              ]}
            />
          </div>

          <aside className="space-y-6">
            <div className="sticky top-6">
              <Card>
                <CardHeader className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-teal-600" />
                    <CardTitle className="text-sm">Notifications</CardTitle>
                  </div>
                  <CardDescription className="text-sm text-slate-500">{stats.unread} unread</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">View your notifications for lab results, appointments and messages.</p>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </div>
    </DashboardShell>
  );
}
