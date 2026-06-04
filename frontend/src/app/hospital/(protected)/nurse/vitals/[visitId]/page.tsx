"use client";

import { ArrowLeft, HeartPulse, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useMemo, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { HOSPITAL_NAV } from "@/lib/hospital/nav-config";
import { formatDateTime } from "@/lib/utils";

interface VisitDetail {
  id: string;
  visit_number: string;
  priority: "normal" | "urgent" | "emergency";
  chief_complaint: string;
  registered_at: string;
  student: {
    id: string;
    full_name: string;
    matric_number: string;
    date_of_birth?: string | null;
    gender: string;
  };
}

const initialVitalsForm = {
  temperature_c: "",
  blood_pressure_systolic: "",
  blood_pressure_diastolic: "",
  pulse_rate: "",
  respiratory_rate: "",
  spo2: "",
  weight_kg: "",
  height_cm: "",
  intake_notes: "",
};

function toNullableNumber(value: string) {
  if (!value.trim()) return null;
  return Number(value);
}

function calculateAge(dateOfBirth?: string | null) {
  if (!dateOfBirth) return "N/A";
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return "N/A";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return `${age}`;
}

function priorityVariant(priority: VisitDetail["priority"]) {
  if (priority === "emergency") return "destructive" as const;
  if (priority === "urgent") return "warning" as const;
  return "secondary" as const;
}

export default function NurseVitalsWorkspacePage() {
  const params = useParams<{ visitId: string }>();
  const router = useRouter();
  const visitId = params.visitId;
  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [form, setForm] = useState(initialVitalsForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const loadVisit = useEffectEvent(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await apiClient.get(`/nurse/visits/${visitId}/`);
      if (data.success) setVisit(data.data as VisitDetail);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load vitals workspace."));
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadVisit();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [visitId]);

  const bmi = useMemo(() => {
    const weight = Number(form.weight_kg);
    const heightCm = Number(form.height_cm);
    if (!weight || !heightCm) return "N/A";
    const heightM = heightCm / 100;
    return (weight / (heightM * heightM)).toFixed(1);
  }, [form.height_cm, form.weight_kg]);

  async function completeTriage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!visit || saving) return;
    setSaving(true);
    setError("");
    setStatusMessage("");
    try {
      const { data } = await apiClient.post("/nurse/vitals/", {
        visit_id: visit.id,
        temperature_c: toNullableNumber(form.temperature_c),
        blood_pressure_systolic: toNullableNumber(form.blood_pressure_systolic),
        blood_pressure_diastolic: toNullableNumber(form.blood_pressure_diastolic),
        pulse_rate: toNullableNumber(form.pulse_rate),
        respiratory_rate: toNullableNumber(form.respiratory_rate),
        spo2: toNullableNumber(form.spo2),
        weight_kg: toNullableNumber(form.weight_kg),
        height_cm: toNullableNumber(form.height_cm),
        intake_notes: form.intake_notes.trim(),
      });
      if (data.success) {
        setStatusMessage("Triage completed. Patient moved to Doctor Queue.");
        window.setTimeout(() => router.push("/hospital/nurse"), 700);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to complete triage."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardShell title="Record Vitals" subtitle="Loading triage workspace" navItems={HOSPITAL_NAV.nurse} hideSidebar>
        <Card><CardContent className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading visit...</CardContent></Card>
      </DashboardShell>
    );
  }

  if (!visit) {
    return (
      <DashboardShell title="Record Vitals" subtitle="Visit unavailable" navItems={HOSPITAL_NAV.nurse} hideSidebar>
        <Card><CardContent className="space-y-4 p-6"><p className="text-sm text-red-700">{error || "Unable to load this visit."}</p><Button asChild variant="outline"><Link href="/hospital/nurse">Back to Nurse Queue</Link></Button></CardContent></Card>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Record Vitals" subtitle="Dedicated nurse triage workspace" navItems={HOSPITAL_NAV.nurse} hideSidebar>
      <form onSubmit={completeTriage} className="space-y-6">
        <header className="sticky top-16 z-30 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold text-slate-950">{visit.student.full_name}</h2>
                <Badge variant={priorityVariant(visit.priority)}>{visit.priority}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {visit.student.matric_number} · Visit {visit.visit_number} · {calculateAge(visit.student.date_of_birth)} yrs · {visit.student.gender || "N/A"} · Arrived {formatDateTime(visit.registered_at)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild type="button" variant="outline"><Link href="/hospital/nurse"><ArrowLeft className="h-4 w-4" /> Back to Queue</Link></Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Complete Triage</Button>
            </div>
          </div>
        </header>

        {(error || statusMessage) && (
          <div className="space-y-2">
            {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {statusMessage && <p className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">{statusMessage}</p>}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Patient Information</CardTitle>
                <CardDescription>Read-only registration context.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Info label="Name" value={visit.student.full_name} />
                <Info label="Matric Number" value={visit.student.matric_number} />
                <Info label="Age" value={calculateAge(visit.student.date_of_birth)} />
                <Info label="Gender" value={visit.student.gender || "N/A"} />
                <Info label="Visit ID" value={visit.visit_number} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><HeartPulse className="h-5 w-5 text-teal-700" /> Nurse Intake</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Info label="Chief Complaint" value={visit.chief_complaint || "General consultation intake"} />
                <div className="space-y-2">
                  <Label htmlFor="intake_notes">Intake Notes</Label>
                  <textarea id="intake_notes" className="min-h-36 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500" value={form.intake_notes} onChange={(event) => setForm((current) => ({ ...current, intake_notes: event.target.value }))} />
                </div>
              </CardContent>
            </Card>
          </aside>

          <main className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Vitals Form</CardTitle>
                <CardDescription>Record triage vitals once, then complete handoff to Doctor Queue.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <NumberField label="Temperature (°C)" value={form.temperature_c} onChange={(value) => setForm((current) => ({ ...current, temperature_c: value }))} step="0.1" />
                <NumberField label="BP Systolic" value={form.blood_pressure_systolic} onChange={(value) => setForm((current) => ({ ...current, blood_pressure_systolic: value }))} />
                <NumberField label="BP Diastolic" value={form.blood_pressure_diastolic} onChange={(value) => setForm((current) => ({ ...current, blood_pressure_diastolic: value }))} />
                <NumberField label="Pulse Rate" value={form.pulse_rate} onChange={(value) => setForm((current) => ({ ...current, pulse_rate: value }))} />
                <NumberField label="Respiratory Rate" value={form.respiratory_rate} onChange={(value) => setForm((current) => ({ ...current, respiratory_rate: value }))} />
                <NumberField label="Oxygen Saturation (%)" value={form.spo2} onChange={(value) => setForm((current) => ({ ...current, spo2: value }))} />
                <NumberField label="Weight (kg)" value={form.weight_kg} onChange={(value) => setForm((current) => ({ ...current, weight_kg: value }))} step="0.1" />
                <NumberField label="Height (cm)" value={form.height_cm} onChange={(value) => setForm((current) => ({ ...current, height_cm: value }))} step="0.1" />
                <Info label="BMI" value={bmi} />
              </CardContent>
            </Card>
          </main>
        </div>
      </form>
    </DashboardShell>
  );
}

function NumberField({ label, value, onChange, step = "1" }: { label: string; value: string; onChange: (value: string) => void; step?: string }) {
  const id = label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" min="0" step={step} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-slate-900">{value || "N/A"}</p>
    </div>
  );
}
