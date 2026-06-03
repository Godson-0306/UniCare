"use client";

import { Search, UserRoundCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api/errors";
import { HOSPITAL_NAV } from "@/lib/hospital/nav-config";
import { apiClient } from "@/lib/api/client";

interface StudentProfile {
  id: string;
  full_name: string;
  matric_number: string;
  faculty: string;
  department: string;
  level: string;
  summary?: {
    previous_visits_count: number;
    latest_visit?: {
      visit_number: string;
      status: string;
    } | null;
    verified_flags: string[];
    active_emergency: boolean;
  };
}

const initialVisitForm = {
  chief_complaint: "",
  symptoms_summary: "",
  priority: "normal",
  reception_notes: "",
};

export default function CreateVisitPage() {
  const searchParams = useSearchParams();
  const initialMatric = typeof searchParams.get("matric") === "string" ? searchParams.get("matric") ?? "" : "";
  const [search, setSearch] = useState<string>(initialMatric);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [visitForm, setVisitForm] = useState(initialVisitForm);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const hasLoadedInitialResults = useRef(false);

  const runSearch = useCallback(async (searchValueOverride?: unknown) => {
    const rawValue =
      typeof (searchValueOverride ?? search) === "string"
        ? String(searchValueOverride ?? search)
        : "";
    const searchValue = rawValue.trim();
    setLoadingSearch(true);
    setError("");
    setStatus("");
    try {
      const query = searchValue ? `?query=${encodeURIComponent(searchValue)}&limit=100` : "?limit=100";
      const { data } = await apiClient.get(`/reception/students/search/${query}`);
      if (data.success) {
        const found = Array.isArray(data.data) ? data.data : [];
        setStudents(found);
        setSelectedStudent((current) => {
          if (current) {
            return found.find((student) => student.id === current.id) ?? null;
          }
          return found[0] ?? null;
        });
      }
    } catch (err) {
      setStudents([]);
      setSelectedStudent(null);
      setError(getApiErrorMessage(err, "Student search failed."));
    } finally {
      setLoadingSearch(false);
    }
  }, [search]);

  useEffect(() => {
    if (hasLoadedInitialResults.current) return;
    hasLoadedInitialResults.current = true;
    const timer = window.setTimeout(() => {
      void runSearch(initialMatric);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialMatric, runSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void runSearch(search);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search, runSearch]);

  async function submitVisit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStudent) {
      setError("Select a student profile before creating a visit.");
      return;
    }

    setSubmitting(true);
    setError("");
    setStatus("");
    try {
      const { data } = await apiClient.post("/reception/visits/", {
        matric_number: selectedStudent.matric_number,
        ...visitForm,
      });
      if (data.success) {
        setStatus(`Visit ${data.data.visit_number} created and assigned to the nurse queue.`);
        setVisitForm(initialVisitForm);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Visit creation failed."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardShell title="Create Visit" subtitle="Register a new visit and send the patient into the care workflow" navItems={HOSPITAL_NAV.receptionist}>
      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-teal-600" />
              Find Student
            </CardTitle>
            <CardDescription>All registered students appear immediately. Type to filter by matric number or name.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={search}
                onChange={(event) => {
                  const next = typeof event.target.value === "string" ? event.target.value : "";
                  setSearch(next);
                  setStatus("");
                  setError("");
                }}
                placeholder="Search by matric number or student name"
              />
              <Button type="button" onClick={() => void runSearch(search)} disabled={loadingSearch}>
                {loadingSearch ? "Filtering..." : "Refresh"}
              </Button>
            </div>
            {loadingSearch && <p className="text-sm text-slate-500">Loading student records...</p>}
            {!loadingSearch && students.length === 0 && !error && (
              <p className="text-sm text-slate-500">No students match your current filter.</p>
            )}

            <div className="space-y-3">
              {students.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setSelectedStudent(student)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selectedStudent?.id === student.id ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-teal-300"
                  }`}
                >
                  <p className="font-medium text-slate-900">{student.full_name}</p>
                  <p className="text-sm text-slate-600">{student.matric_number}</p>
                  <p className="text-xs text-slate-500">
                    {student.faculty} · {student.department} · Level {student.level}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRoundCheck className="h-5 w-5 text-teal-600" />
              Visit Registration
            </CardTitle>
            <CardDescription>Captures the presenting complaint, priority, and nurse-queue handoff.</CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedStudent && <p className="mb-4 text-sm text-slate-500">Select a student to create a visit.</p>}
            {selectedStudent && (
              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="font-medium text-slate-900">{selectedStudent.full_name}</p>
                <p className="text-slate-600">{selectedStudent.matric_number}</p>
                <p className="text-xs text-slate-500">
                  Previous visits: {selectedStudent.summary?.previous_visits_count ?? 0}
                  {selectedStudent.summary?.active_emergency ? " · Active emergency flag" : ""}
                </p>
              </div>
            )}
            <form onSubmit={submitVisit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="chief_complaint">Reason for visit</Label>
                <Input
                  id="chief_complaint"
                  value={visitForm.chief_complaint}
                  onChange={(event) => setVisitForm((current) => ({ ...current, chief_complaint: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="symptoms_summary">Symptoms summary</Label>
                <textarea
                  id="symptoms_summary"
                  className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={visitForm.symptoms_summary}
                  onChange={(event) => setVisitForm((current) => ({ ...current, symptoms_summary: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                  value={visitForm.priority}
                  onChange={(event) => setVisitForm((current) => ({ ...current, priority: event.target.value }))}
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reception_notes">Notes</Label>
                <textarea
                  id="reception_notes"
                  className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={visitForm.reception_notes}
                  onChange={(event) => setVisitForm((current) => ({ ...current, reception_notes: event.target.value }))}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting || !selectedStudent}>
                {submitting ? "Creating visit..." : "Create Visit and Send to Nurse Queue"}
              </Button>
            </form>
            {status && <p className="mt-4 text-sm text-teal-700">{status}</p>}
            {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
