"use client";

import { Loader2, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";

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

interface NurseQueueVisit {
  id: string;
  visit_number: string;
  student_name: string;
  matric_number: string;
  status: string;
  priority: "normal" | "urgent" | "emergency";
  chief_complaint: string;
  registered_at: string;
  created_at: string;
  nurse_queue_entry_id: string | null;
  nurse_queue_status: string | null;
}

const initialVitalsForm = {
  blood_pressure_systolic: "",
  blood_pressure_diastolic: "",
  temperature_c: "",
  pulse_rate: "",
  weight_kg: "",
  intake_notes: "",
};

function priorityVariant(priority: NurseQueueVisit["priority"]) {
  if (priority === "emergency") return "destructive" as const;
  if (priority === "urgent") return "warning" as const;
  return "secondary" as const;
}

function toNullableNumber(value: string) {
  if (!value.trim()) return null;
  return Number(value);
}

export default function NurseDashboardPage() {
  const [queue, setQueue] = useState<NurseQueueVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedVisit, setSelectedVisit] = useState<NurseQueueVisit | null>(null);
  const [startingVisitId, setStartingVisitId] = useState<string | null>(null);
  const [submittingVisitId, setSubmittingVisitId] = useState<string | null>(null);
  const [vitalsForm, setVitalsForm] = useState(initialVitalsForm);

  async function loadQueue(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");
    try {
      const { data } = await apiClient.get("/nurse/queue/");
      if (data.success) {
        const nextQueue = data.data as NurseQueueVisit[];
        setQueue(nextQueue);
        setSelectedVisit((current) => nextQueue.find((item) => item.id === current?.id) ?? null);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load the nurse queue."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadQueue();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function openVitals(visit: NurseQueueVisit) {
    setStartingVisitId(visit.id);
    setError("");
    setStatusMessage("");

    try {
      if (visit.nurse_queue_entry_id && visit.nurse_queue_status === "waiting") {
        await apiClient.post(`/nurse/queue/${visit.nurse_queue_entry_id}/start/`);
      }
      setSelectedVisit(visit);
      setVitalsForm(initialVitalsForm);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to start this nurse intake session."));
    } finally {
      setStartingVisitId(null);
    }
  }

  async function submitVitals(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedVisit || submittingVisitId) return;

    setSubmittingVisitId(selectedVisit.id);
    setError("");
    setStatusMessage("");

    try {
      const { data } = await apiClient.post("/nurse/vitals/", {
        visit_id: selectedVisit.id,
        blood_pressure_systolic: toNullableNumber(vitalsForm.blood_pressure_systolic),
        blood_pressure_diastolic: toNullableNumber(vitalsForm.blood_pressure_diastolic),
        temperature_c: toNullableNumber(vitalsForm.temperature_c),
        pulse_rate: toNullableNumber(vitalsForm.pulse_rate),
        weight_kg: toNullableNumber(vitalsForm.weight_kg),
        intake_notes: vitalsForm.intake_notes.trim(),
      });

      if (data.success) {
        setQueue((current) => current.filter((item) => item.id !== selectedVisit.id));
        setStatusMessage(`Vitals recorded for ${selectedVisit.student_name}. The visit has moved to the doctor queue.`);
        setSelectedVisit(null);
        setVitalsForm(initialVitalsForm);
        void loadQueue(false);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to record vitals."));
    } finally {
      setSubmittingVisitId(null);
    }
  }

  return (
    <DashboardShell
      title="Nursing Station"
      subtitle="Live intake queue for vitals capture and doctor handoff"
      navItems={HOSPITAL_NAV.nurse}
    >
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Nurse Queue</CardTitle>
                <CardDescription>Pending visits are ordered by arrival time so intake can move in a steady FIFO flow.</CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={() => void loadQueue(false)} disabled={loading || refreshing}>
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                {refreshing ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {statusMessage && <p className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-700">{statusMessage}</p>}
            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {loading && <p className="text-sm text-slate-500">Loading nurse queue...</p>}
            {!loading && queue.length === 0 && <p className="text-sm text-slate-500">No active visits are waiting for vitals.</p>}

            <div className="space-y-3">
              {queue.map((visit) => {
                const isActive = selectedVisit?.id === visit.id;
                const isBusy = startingVisitId === visit.id || submittingVisitId === visit.id;

                return (
                  <div key={visit.id} className={`rounded-xl border p-4 transition-colors ${isActive ? "border-teal-300 bg-teal-50/50" : "border-slate-200"}`}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900">{visit.student_name}</p>
                          <Badge variant={priorityVariant(visit.priority)}>{visit.priority}</Badge>
                        </div>
                        <p className="text-sm text-slate-600">{visit.matric_number}</p>
                        <p className="text-sm text-slate-700">{visit.chief_complaint || "General consultation intake"}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                          <span>Visit: {visit.visit_number}</span>
                          <span>Created: {formatDateTime(visit.registered_at || visit.created_at)}</span>
                        </div>
                      </div>
                      <Button type="button" onClick={() => void openVitals(visit)} disabled={isBusy}>
                        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {isBusy ? "Opening..." : "Record Vitals"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{selectedVisit ? `Record Vitals for ${selectedVisit.student_name}` : "Vitals Capture"}</CardTitle>
            <CardDescription>
              {selectedVisit
                ? "Submit vitals once, remove the patient from the nurse queue, and forward the visit to the doctor queue."
                : "Select a visit from the queue to begin vitals intake."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedVisit ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-sm text-slate-500">
                Choose a queued visit to open the vitals form.
              </div>
            ) : (
              <form onSubmit={submitVitals} className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">{selectedVisit.student_name}</p>
                  <p>{selectedVisit.matric_number}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedVisit.visit_number} | {selectedVisit.chief_complaint || "General consultation intake"}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="blood_pressure_systolic">Blood pressure (systolic)</Label>
                    <Input
                      id="blood_pressure_systolic"
                      type="number"
                      min="0"
                      value={vitalsForm.blood_pressure_systolic}
                      onChange={(event) => setVitalsForm((current) => ({ ...current, blood_pressure_systolic: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="blood_pressure_diastolic">Blood pressure (diastolic)</Label>
                    <Input
                      id="blood_pressure_diastolic"
                      type="number"
                      min="0"
                      value={vitalsForm.blood_pressure_diastolic}
                      onChange={(event) => setVitalsForm((current) => ({ ...current, blood_pressure_diastolic: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="temperature_c">Temperature (C)</Label>
                    <Input
                      id="temperature_c"
                      type="number"
                      step="0.1"
                      min="0"
                      value={vitalsForm.temperature_c}
                      onChange={(event) => setVitalsForm((current) => ({ ...current, temperature_c: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pulse_rate">Pulse</Label>
                    <Input
                      id="pulse_rate"
                      type="number"
                      min="0"
                      value={vitalsForm.pulse_rate}
                      onChange={(event) => setVitalsForm((current) => ({ ...current, pulse_rate: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight_kg">Weight (kg)</Label>
                    <Input
                      id="weight_kg"
                      type="number"
                      step="0.1"
                      min="0"
                      value={vitalsForm.weight_kg}
                      onChange={(event) => setVitalsForm((current) => ({ ...current, weight_kg: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="intake_notes">Symptoms</Label>
                  <textarea
                    id="intake_notes"
                    className="min-h-28 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    value={vitalsForm.intake_notes}
                    onChange={(event) => setVitalsForm((current) => ({ ...current, intake_notes: event.target.value }))}
                    placeholder="Document symptoms and nursing intake notes."
                  />
                </div>

                <div className="flex gap-3">
                  <Button type="submit" className="flex-1" disabled={submittingVisitId === selectedVisit.id}>
                    {submittingVisitId === selectedVisit.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {submittingVisitId === selectedVisit.id ? "Saving vitals..." : "Submit Vitals"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedVisit(null);
                      setVitalsForm(initialVitalsForm);
                    }}
                    disabled={submittingVisitId === selectedVisit.id}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
