"use client";

import { Calendar, Clock, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AppointmentCard({ appt }: { appt: Record<string, any> }) {
  const date = appt.scheduled_at ?? appt.date ?? appt.start_time ?? null;
  const doc = appt.doctor_name ?? appt.created_by ?? appt.department ?? "—";
  const purpose = appt.title ?? appt.purpose ?? "Clinic Appointment";
  const status = appt.status ?? "scheduled";

  return (
    <Card>
      <CardHeader className="flex items-start justify-between p-4">
        <div>
          <CardTitle className="text-sm">{purpose}</CardTitle>
          <CardDescription className="text-xs text-slate-500">With {doc}</CardDescription>
        </div>
        <div className="text-right">
          {date && <div className="text-sm font-semibold text-slate-900">{new Date(date).toLocaleString()}</div>}
          <div className="mt-1 text-xs text-slate-500">{status}</div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 text-sm text-slate-700">
        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-slate-500" />
          <div>{appt.notes ?? appt.description ?? "No additional details."}</div>
        </div>
      </CardContent>
    </Card>
  );
}
