"use client";

import { useEffect, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";

const studentNav = [
  { label: "Dashboard", href: "/student/dashboard" },
  { label: "Timeline", href: "/student/timeline" },
  { label: "Prescriptions", href: "/student/prescriptions" },
  { label: "Lab Results", href: "/student/lab-results" },
  { label: "Appointments", href: "/student/appointments" },
  { label: "Medical History", href: "/student/medical-history" },
  { label: "Notifications", href: "/student/notifications" },
];

interface TimelineItem {
  kind: string;
  timestamp: string;
  title: string;
  status: string;
  details: Record<string, unknown>;
}

export default function StudentTimelinePage() {
  const [items, setItems] = useState<TimelineItem[]>([]);

  useEffect(() => {
    apiClient.get("/student/timeline/").then((res) => {
      if (res.data.success) {
        setItems(res.data.data);
      }
    });
  }, []);

  return (
    <DashboardShell title="Medical Timeline" subtitle="Unified view of visits, treatment, and clinical events" navItems={studentNav}>
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 && <p className="text-sm text-slate-500">No timeline events available.</p>}
          {items.map((item, index) => (
            <div key={`${item.kind}-${index}`} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs uppercase tracking-wide text-teal-700">{item.kind.replaceAll("_", " ")}</p>
                </div>
                <p className="text-xs text-slate-400">{formatDateTime(item.timestamp)}</p>
              </div>
              <p className="mt-2 text-sm text-slate-600">Status: {item.status}</p>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-slate-500">
                {JSON.stringify(item.details, null, 2)}
              </pre>
            </div>
          ))}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
