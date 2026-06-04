"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api";
import PrescriptionCard from "@/components/student/PrescriptionCard";
import EmptyState from "@/components/student/EmptyState";

const studentNav = [
  { label: "Dashboard", href: "/student/dashboard" },
  { label: "Prescriptions", href: "/student/prescriptions" },
  { label: "Lab Results", href: "/student/lab-results" },
  { label: "Appointments", href: "/student/appointments" },
  { label: "Medical History", href: "/student/medical-history" },
  { label: "Notifications", href: "/student/notifications" },
];

export default function StudentPrescriptionsPage() {
  const [items, setItems] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<ApiResponse<Record<string, any>[]>>("/student/prescriptions/").then((res) => {
      if (res.data.success) setItems(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <DashboardShell title="Prescriptions" navItems={studentNav}>
      <Card>
        <CardHeader>
          <CardTitle>Prescriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
          </div>}
          {!loading && items.length === 0 && <EmptyState title="No prescriptions" description="You have no active or past prescriptions." />}
          <div className="grid gap-4">
            {items.map((it) => (
              <PrescriptionCard key={it.id ?? JSON.stringify(it)} item={it} />
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
