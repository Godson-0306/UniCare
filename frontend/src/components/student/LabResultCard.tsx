"use client";

import Link from "next/link";
import { Download, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function LabResultCard({ item }: { item: Record<string, any> }) {
  const name = item.test_name ?? item.name ?? "Lab Test";
  const date = item.date ?? item.created_at ?? null;
  const status = item.status ?? "available";
  const orderedBy = item.ordered_by ?? item.ordered_by_name ?? "—";
  const id = item.id ?? item.pk ?? "";
  const reportUrl = item.report_url ?? item.report ?? null;

  return (
    <Card>
      <CardHeader className="flex items-start justify-between p-4">
        <div>
          <CardTitle className="text-sm">{name}</CardTitle>
          {date && <CardDescription className="text-xs text-slate-500">{new Date(date).toLocaleString()}</CardDescription>}
          <div className="mt-1 text-xs text-slate-600">Ordered by: {orderedBy}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-sm font-semibold text-slate-900">{status}</div>
          <div className="flex gap-2">
            {reportUrl ? (
              <a href={reportUrl} target="_blank" rel="noreferrer" className="text-slate-600 hover:text-slate-900">
                <Download className="h-4 w-4" />
              </a>
            ) : (
              <Link href={`/student/lab-results/${id}`} className="text-slate-600 hover:text-slate-900">
                View
              </Link>
            )}
            <button onClick={() => window.print()} aria-label="Print report" className="text-slate-600 hover:text-slate-900">
              <Printer className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-sm text-slate-700">{item.summary ?? item.notes ?? "No report summary available."}</p>
      </CardContent>
    </Card>
  );
}
