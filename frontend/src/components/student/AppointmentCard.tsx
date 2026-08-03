"use client";

import { Clock } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AppointmentCard({ appt }: { appt: Record<string, unknown> }) {
  const date = appt.scheduled_at ?? appt.date ?? appt.start_time ?? null;
  const doctor = appt.doctor_name ?? appt.created_by ?? appt.department ?? "-";
  const purpose = appt.title ?? appt.purpose ?? "Clinic Appointment";
  const status = appt.status ?? "scheduled";

  return (
    <Card>
      <CardHeader className="flex items-start justify-between p-4">
        <div>
          <CardTitle className="text-sm">{String(purpose)}</CardTitle>
          <CardDescription className="text-xs text-slate-500">With {String(doctor)}</CardDescription>
        </div>
        <div className="text-right">
          {typeof date === "string" && <div className="text-sm font-semibold text-slate-900">{new Date(date).toLocaleString()}</div>}
          <div className="mt-1 text-xs text-slate-500">{String(status)}</div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 text-sm text-slate-700">
        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-slate-500" />
          <div>{String(appt.notes ?? appt.description ?? "No additional details.")}</div>
        </div>
      </CardContent>
    </Card>
  );
}
