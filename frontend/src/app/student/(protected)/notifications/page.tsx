"use client";

import { z } from "zod";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import NotificationsFeed from "@/components/student/NotificationsFeed";
import { useApiQuery } from "@/hooks/use-api-query";
import { STUDENT_NAV } from "@/lib/student/nav-config";

const notificationSchema = z.object({
  id: z.string(),
  type: z.string().optional(),
  title: z.string().optional(),
  message: z.string().optional(),
  subtitle: z.string().optional(),
  summary: z.string().optional(),
  is_read: z.boolean().default(false),
  created_at: z.string().optional(),
  timestamp: z.string().optional(),
});

export default function StudentNotificationsPage() {
  const { data: items = [] } = useApiQuery(["student", "notifications"], "/student/notifications/", z.array(notificationSchema));

  return (
    <DashboardShell title="Notifications" navItems={STUDENT_NAV}>
      <NotificationsFeed key={items.map((item) => item.id).join(":")} initial={items} />
    </DashboardShell>
  );
}
