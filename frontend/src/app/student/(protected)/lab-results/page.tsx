"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";
import { STUDENT_NAV } from "@/lib/student/nav-config";
import type { ApiResponse } from "@/types/api";
import LabResultCard from "@/components/student/LabResultCard";
import EmptyState from "@/components/student/EmptyState";

export default function StudentLabResultsPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<ApiResponse<Record<string, unknown>[]>>("/student/lab-results/").then((res) => {
      if (res.data.success) setItems(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <DashboardShell title="Lab Results" navItems={STUDENT_NAV}>
      <Card>
        <CardHeader>
          <CardTitle>Lab Results</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
          </div>}
          {!loading && items.length === 0 && <EmptyState title="No lab results" description="You have no completed lab results." />}
          <div className="grid gap-4">
            {items.map((it) => (
              <LabResultCard key={String(it.id ?? JSON.stringify(it))} item={it} />
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
