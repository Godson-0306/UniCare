"use client";

import { CheckCircle, Circle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrescriptionCard({ item }: { item: Record<string, unknown> }) {
  const name = item.medication_name ?? item.name ?? "Medication";
  const dosage = item.dosage ?? item.amount ?? item.dose ?? "-";
  const frequency = item.frequency ?? item.schedule ?? "-";
  const duration = item.duration ?? item.days ?? "-";
  const instructions = item.instructions ?? item.note ?? item.notes ?? "No special instructions.";
  const status = String(item.status ?? item.state ?? "active");
  const statusColor = status === "active" ? "text-teal-700" : status === "completed" ? "text-slate-600" : "text-amber-700";

  return (
    <Card>
      <CardHeader className="flex items-start justify-between p-4">
        <div>
          <CardTitle className="text-sm">{String(name)}</CardTitle>
          <CardDescription className="text-xs text-slate-500">{String(dosage)} / {String(frequency)} / {String(duration)}</CardDescription>
        </div>
        <div className="text-right">
          {status === "active" ? <CheckCircle className="h-5 w-5 text-teal-600" /> : <Circle className="h-4 w-4 text-slate-400" />}
          <div className={`mt-1 text-xs ${statusColor}`}>{status}</div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-sm text-slate-700">{String(instructions)}</p>
      </CardContent>
    </Card>
  );
}
