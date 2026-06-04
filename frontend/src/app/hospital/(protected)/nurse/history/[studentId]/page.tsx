"use client";

import { ArrowLeft, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useEffectEvent, useMemo, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { HOSPITAL_NAV } from "@/lib/hospital/nav-config";
import { formatDateTime } from "@/lib/utils";

interface VisitDetail {
  id: string;
  visit_number: string;
  status: string;
  priority: "normal" | "urgent" | "emergency";
  chief_complaint: string;
  registered_at: string;
  student: {
    full_name: string;
    matric_number: string;
    department: string;
  };
  consultation?: {
    diagnosis: string;
    assessment: string;
    plan: string;
  } | null;
  vitals_records: Array<{
    temperature_c?: string | null;
    blood_pressure_systolic?: number | null;
    blood_pressure_diastolic?: number | null;
    pulse_rate?: number | null;
    respiratory_rate?: number | null;
    spo2?: number | null;
    created_at: string;
  }>;
}

function priorityVariant(priority: VisitDetail["priority"]) {
  if (priority === "emergency") return "destructive" as const;
  if (priority === "urgent") return "warning" as const;
  return "secondary" as const;
}

function formatBp(visit: VisitDetail) {
  const latest = visit.vitals_records[0];
  return latest?.blood_pressure_systolic && latest?.blood_pressure_diastolic
    ? `${latest.blood_pressure_systolic}/${latest.blood_pressure_diastolic} mmHg`
    : "N/A";
}

export default function NursePatientHistoryPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId;
  const [history, setHistory] = useState<VisitDetail[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = useEffectEvent(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await apiClient.get(`/nurse/students/${studentId}/history/`);
      if (data.success) setHistory(data.data as VisitDetail[]);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load patient history."));
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadHistory();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [studentId]);

  const filteredHistory = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return history;
    return history.filter((visit) =>
      [visit.visit_number, visit.status, visit.chief_complaint, visit.consultation?.diagnosis, visit.consultation?.assessment]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [history, query]);

  const student = history[0]?.student;

  return (
    <DashboardShell title="Nurse Patient History" subtitle="Previous visits and triage records" navItems={HOSPITAL_NAV.nurse} hideSidebar>
      <div className="space-y-6">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Patient History</p>
            <h2 className="text-2xl font-semibold text-slate-950">{student?.full_name ?? "Patient Record"}</h2>
            <p className="text-sm text-slate-500">{student ? `${student.matric_number} · ${student.department}` : "Previous visits, diagnoses, consultations, and vitals."}</p>
          </div>
          <Button asChild variant="outline"><Link href="/hospital/nurse"><ArrowLeft className="h-4 w-4" /> Back to Nurse Queue</Link></Button>
        </header>

        <Card>
          <CardContent className="relative p-4">
            <Search className="absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Search visit, diagnosis, complaint, or status" value={query} onChange={(event) => setQuery(event.target.value)} />
          </CardContent>
        </Card>

        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {loading && <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading history...</p>}
        {!loading && filteredHistory.length === 0 && <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">No patient history found.</p>}

        <section className="grid gap-4 xl:grid-cols-2">
          {filteredHistory.map((visit) => {
            const latestVitals = visit.vitals_records[0];
            return (
              <Card key={visit.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{visit.visit_number}</CardTitle>
                      <CardDescription>{formatDateTime(visit.registered_at)} · {visit.status.replaceAll("_", " ")}</CardDescription>
                    </div>
                    <Badge variant={priorityVariant(visit.priority)}>{visit.priority}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm md:grid-cols-2">
                  <Info label="Chief Complaint" value={visit.chief_complaint || "N/A"} />
                  <Info label="Diagnosis" value={visit.consultation?.diagnosis || visit.consultation?.assessment || "N/A"} />
                  <Info label="Temperature" value={latestVitals?.temperature_c ? `${latestVitals.temperature_c} °C` : "N/A"} />
                  <Info label="Blood Pressure" value={formatBp(visit)} />
                  <Info label="Pulse / Resp." value={`${latestVitals?.pulse_rate ?? "N/A"} / ${latestVitals?.respiratory_rate ?? "N/A"}`} />
                  <Info label="Oxygen Saturation" value={latestVitals?.spo2 ? `${latestVitals.spo2}%` : "N/A"} />
                </CardContent>
              </Card>
            );
          })}
        </section>
      </div>
    </DashboardShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-line text-slate-900">{value || "N/A"}</p>
    </div>
  );
}
