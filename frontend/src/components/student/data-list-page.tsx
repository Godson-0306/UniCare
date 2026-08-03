"use client";

import { useEffect, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";
import { STUDENT_NAV } from "@/lib/student/nav-config";
import { formatDateTime } from "@/lib/utils";
import type { ApiResponse } from "@/types/api";

interface DataListPageProps {
  title: string;
  endpoint: string;
  emptyMessage: string;
}

export function DataListPage({ title, endpoint, emptyMessage }: DataListPageProps) {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    apiClient.get<ApiResponse<Record<string, unknown>[]>>(endpoint).then((res) => {
      if (res.data.success) setItems(res.data.data);
    });
  }, [endpoint]);

  return (
    <DashboardShell title={title} navItems={STUDENT_NAV}>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 && <p className="text-sm text-slate-500">{emptyMessage}</p>}
          <ul className="space-y-4">
            {items.map((item, i) => (
              <li key={i} className="rounded-lg border border-slate-100 p-4 text-sm">
                <pre className="whitespace-pre-wrap text-xs text-slate-700">{JSON.stringify(item, null, 2)}</pre>
                {"created_at" in item && typeof item.created_at === "string" && (
                  <p className="mt-2 text-xs text-slate-400">{formatDateTime(item.created_at)}</p>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
