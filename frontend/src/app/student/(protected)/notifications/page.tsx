"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import NotificationsFeed from "@/components/student/NotificationsFeed";
import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api";

const studentNav = [
  { label: "Dashboard", href: "/student/dashboard" },
  { label: "Prescriptions", href: "/student/prescriptions" },
  { label: "Lab Results", href: "/student/lab-results" },
  { label: "Appointments", href: "/student/appointments" },
  { label: "Medical History", href: "/student/medical-history" },
  { label: "Notifications", href: "/student/notifications" },
];

export default function StudentNotificationsPage() {
  const [items, setItems] = useState<Record<string, any>[]>([]);

  useEffect(() => {
    apiClient.get<ApiResponse<Record<string, any>[]>>("/student/notifications/").then((res) => {
      if (res.data.success) setItems(res.data.data);
    });
  }, []);

  return (
    <DashboardShell title="Notifications" navItems={studentNav}>
      <NotificationsFeed initial={items} />
    </DashboardShell>
  );
}
