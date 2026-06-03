"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Bell, Calendar, FileText, FlaskConical, History } from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api";

const studentNav = [
  { label: "Dashboard", href: "/student/dashboard" },
  { label: "Timeline", href: "/student/timeline" },
  { label: "Prescriptions", href: "/student/prescriptions" },
  { label: "Lab Results", href: "/student/lab-results" },
  { label: "Appointments", href: "/student/appointments" },
  { label: "Medical History", href: "/student/medical-history" },
  { label: "Notifications", href: "/student/notifications" },
];

export default function StudentDashboardPage() {
  const [stats, setStats] = useState({ prescriptions: 0, labResults: 0, appointments: 0, unread: 0, timeline: 0 });

  useEffect(() => {
    async function load() {
      try {
        const [rx, lab, appt, notif, timeline] = await Promise.all([
          apiClient.get<ApiResponse<unknown[]>>("/student/prescriptions/"),
          apiClient.get<ApiResponse<unknown[]>>("/student/lab-results/"),
          apiClient.get<ApiResponse<unknown[]>>("/student/appointments/"),
          apiClient.get<ApiResponse<{ is_read: boolean }[]>>("/student/notifications/"),
          apiClient.get<ApiResponse<unknown[]>>("/student/timeline/"),
        ]);
        setStats({
          prescriptions: rx.data.success ? rx.data.data.length : 0,
          labResults: lab.data.success ? lab.data.data.length : 0,
          appointments: appt.data.success ? appt.data.data.length : 0,
          unread: notif.data.success ? notif.data.data.filter((n) => !n.is_read).length : 0,
          timeline: timeline.data.success ? timeline.data.data.length : 0,
        });
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
    { label: "Timeline Events", value: stats.timeline, href: "/student/timeline", icon: History },
  ];

  return (
    <DashboardShell title="Student Portal" subtitle="Your health records at a glance" navItems={studentNav}>
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-red-800">Emergency Assistance</CardTitle>
              <CardDescription className="text-red-700">
                Triggers emergency dial and priority visit bypass
              </CardDescription>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </CardHeader>
          <CardContent>
            <Button asChild variant="destructive">
              <Link href="/student/emergency">Request Emergency Help</Link>
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map(({ label, value, href, icon: Icon }) => (
            <Link key={href} href={href}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardDescription>{label}</CardDescription>
                  <Icon className="h-4 w-4 text-teal-600" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-900">{value}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <History className="h-5 w-5 text-teal-600" />
            <CardTitle>Quick Access</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge>Matric-based login</Badge>
            <Badge variant="secondary">Real-time notifications</Badge>
            <Badge variant="secondary">Medical history</Badge>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
