"use client";

import { useEffect, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import { HOSPITAL_NAV } from "@/lib/hospital/nav-config";
import { formatDateTime } from "@/lib/utils";

interface QueueEntry {
  visit: string;
  student_name: string;
  matric_number: string;
  visit_number: string;
}

interface MedicalRecord {
  id: string;
  title: string;
  details: string;
  record_type: string;
  created_at: string;
}

export default function DoctorConsultationWorkspacePage() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [consultation, setConsultation] = useState({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
    diagnosis: "",
    follow_up_notes: "",
  });
  const [medicalForm, setMedicalForm] = useState({
    record_type: "diagnosed_condition",
    title: "",
    details: "",
  });
  const [status, setStatus] = useState("");

  useEffect(() => {
    apiClient
      .get("/doctor/queue/")
      .then((res) => {
        if (res.data.success) setQueue(res.data.data);
      })
      .catch(() => setQueue([]));
  }, []);

  async function loadVisitContext(visitId: string) {
    setSelectedVisitId(visitId);
    const visitRes = await apiClient.get(`/doctor/visits/${visitId}/`);
    if (visitRes.data.success) {
      const studentId = visitRes.data.data.student.id as string;
      setSelectedStudentId(studentId);
      const profileRes = await apiClient.get(`/doctor/students/${studentId}/medical-profile/`);
      if (profileRes.data.success) {
        setMedicalRecords(profileRes.data.data.records);
      }
    }
  }

  async function saveConsultation() {
    if (!selectedVisitId) return;
    const { data } = await apiClient.post("/doctor/consultations/", { visit_id: selectedVisitId, ...consultation });
    if (data.success) {
      setStatus("Consultation saved.");
    }
  }

  async function addMedicalRecord() {
    if (!selectedStudentId || !selectedVisitId) return;
    const { data } = await apiClient.post(`/doctor/students/${selectedStudentId}/medical-profile/records/`, {
      visit_id: selectedVisitId,
      ...medicalForm,
    });
    if (data.success) {
      setMedicalRecords((current) => [data.data, ...current]);
      setMedicalForm({ record_type: "diagnosed_condition", title: "", details: "" });
      setStatus("Verified medical record added.");
    }
  }

  return (
    <DashboardShell title="Consultation Workspace" subtitle="Doctor-controlled medical profile updates" navItems={HOSPITAL_NAV.doctor}>
      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>Doctor Queue</CardTitle>
            <CardDescription>Select a queued visit to document consultation and verified records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {queue.map((entry) => (
              <button
                key={entry.visit}
                type="button"
                onClick={() => loadVisitContext(entry.visit)}
                className="w-full rounded-lg border border-slate-200 p-4 text-left transition hover:border-teal-300 hover:bg-teal-50"
              >
                <p className="font-medium text-slate-900">{entry.student_name}</p>
                <p className="text-sm text-slate-600">{entry.matric_number}</p>
                <p className="text-xs text-slate-400">{entry.visit_number}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Consultation Notes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {Object.entries(consultation).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{key.replaceAll("_", " ")}</Label>
                  <textarea
                    id={key}
                    className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={value}
                    onChange={(event) => setConsultation((current) => ({ ...current, [key]: event.target.value }))}
                  />
                </div>
              ))}
              <Button type="button" className="md:col-span-2" onClick={saveConsultation} disabled={!selectedVisitId}>
                Save consultation
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Verified Medical Record</CardTitle>
              <CardDescription>Add allergies, diagnoses, chronic illnesses, deformities, or special notes.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="record_type">Record type</Label>
                <select
                  id="record_type"
                  className="h-10 rounded-md border border-slate-200 px-3 text-sm"
                  value={medicalForm.record_type}
                  onChange={(event) => setMedicalForm((current) => ({ ...current, record_type: event.target.value }))}
                >
                  <option value="allergy">Allergy</option>
                  <option value="diagnosed_condition">Diagnosed condition</option>
                  <option value="chronic_illness">Chronic illness</option>
                  <option value="deformity">Deformity</option>
                  <option value="special_note">Special note</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="record_title">Title</Label>
                <Input
                  id="record_title"
                  value={medicalForm.title}
                  onChange={(event) => setMedicalForm((current) => ({ ...current, title: event.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="record_details">Details</Label>
                <textarea
                  id="record_details"
                  className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  value={medicalForm.details}
                  onChange={(event) => setMedicalForm((current) => ({ ...current, details: event.target.value }))}
                />
              </div>
              <Button type="button" className="md:col-span-2" onClick={addMedicalRecord} disabled={!selectedVisitId}>
                Add verified record
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Existing Verified Records</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {medicalRecords.length === 0 && <p className="text-sm text-slate-500">No records loaded yet.</p>}
              {medicalRecords.map((record) => (
                <div key={record.id} className="rounded-lg border border-slate-200 p-4 text-sm">
                  <p className="font-medium text-slate-900">{record.title}</p>
                  <p className="mt-1 uppercase tracking-wide text-xs text-teal-700">{record.record_type}</p>
                  <p className="mt-2 text-slate-600">{record.details || "No details provided."}</p>
                  <p className="mt-2 text-xs text-slate-400">{formatDateTime(record.created_at)}</p>
                </div>
              ))}
              {status && <p className="text-sm text-slate-700">{status}</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
