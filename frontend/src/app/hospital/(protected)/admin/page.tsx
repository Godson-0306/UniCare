"use client";

import { useEffect, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";
import { HOSPITAL_NAV } from "@/lib/hospital/nav-config";
import { formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

export default function HospitalAdminPage() {
  const { workstation, user } = useAuthStore();
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    async function load() {
      const [analyticsRes, logsRes] = await Promise.all([
        apiClient.get("/audit/analytics/"),
        apiClient.get("/audit/logs/"),
      ]);
      if (analyticsRes.data.success) setAnalytics(analyticsRes.data.data);
      if (logsRes.data.success) setLogs(logsRes.data.data);
    }

    load().catch(() => {
      setAnalytics(null);
      setLogs([]);
    });
  }, []);

  const totals = (analytics?.totals as Record<string, number> | undefined) ?? {};

  return (
    <DashboardShell
      title="Administration"
      subtitle={`System oversight · ${workstation?.station_name ?? user?.username}`}
      navItems={HOSPITAL_NAV[user?.role ?? "admin"]}
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Object.entries(totals).map(([key, value]) => (
            <Card key={key}>
              <CardHeader>
                <CardDescription>{key.replaceAll("_", " ")}</CardDescription>
                <CardTitle className="text-3xl">{value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Analytics Feed</CardTitle>
            <CardDescription>Operational summaries for visits, diagnostics, pharmacy, and emergencies</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            {["most_common_diagnoses", "pharmacy_usage_trends", "lab_test_frequency", "emergency_case_frequency", "doctor_workload_distribution"].map(
              (section) => (
                <div key={section} className="rounded-lg border border-slate-200 p-4">
                  <p className="mb-3 font-medium capitalize text-slate-900">{section.replaceAll("_", " ")}</p>
                  <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-600">
                    {JSON.stringify((analytics?.[section] as unknown[]) ?? [], null, 2)}
                  </pre>
                </div>
              )
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit Logs</CardTitle>
            <CardDescription>Immutable activity trail for patient and workstation access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {logs.slice(0, 25).map((log) => (
              <div key={String(log.id)} className="rounded-lg border border-slate-200 p-4 text-sm">
                <p className="font-medium text-slate-900">
                  {String(log.action)} · {String(log.entity_type)}
                </p>
                <p className="mt-1 text-slate-600">
                  Actor: {String(log.performed_by ?? "system")} | Workstation: {String(log.workstation_name ?? "-")}
                </p>
                <p className="mt-1 text-xs text-slate-400">{formatDateTime(String(log.created_at))}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
