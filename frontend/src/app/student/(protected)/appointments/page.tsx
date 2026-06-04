"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api";
import AppointmentCard from "@/components/student/AppointmentCard";
import EmptyState from "@/components/student/EmptyState";

const studentNav = [
  { label: "Dashboard", href: "/student/dashboard" },
  { label: "Prescriptions", href: "/student/prescriptions" },
  { label: "Lab Results", href: "/student/lab-results" },
  { label: "Appointments", href: "/student/appointments" },
  { label: "Medical History", href: "/student/medical-history" },
  { label: "Notifications", href: "/student/notifications" },
];

export default function StudentAppointmentsPage() {
  const [items, setItems] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<ApiResponse<Record<string, any>[]>>("/student/appointments/").then((res) => {
      if (res.data.success) setItems(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <DashboardShell title="Appointments" navItems={studentNav}>
      <Card>
        <CardHeader>
          <CardTitle>Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
          </div>}
          {!loading && items.length === 0 && <EmptyState title="No appointments" description="You have no upcoming or past appointments." />}
          <div className="grid gap-4">
            {items.map((it) => (
              <AppointmentCard key={it.id ?? JSON.stringify(it)} appt={it} />
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
