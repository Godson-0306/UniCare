"use client";

import { Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { HOSPITAL_NAV } from "@/lib/hospital/nav-config";

interface StudentResult {
  id: string;
  full_name: string;
  matric_number: string;
  faculty: string;
  department: string;
  level: string;
  summary: {
    previous_visits_count: number;
    latest_visit?: {
      visit_number: string;
      status: string;
      registered_at: string;
    } | null;
    verified_flags: string[];
    active_emergency: boolean;
  };
}

export default function ReceptionDashboardPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [creatingVisitFor, setCreatingVisitFor] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const trimmed = query.trim();
        const suffix = trimmed ? `?query=${encodeURIComponent(trimmed)}` : "";
        const { data } = await apiClient.get(`/reception/students/search/${suffix}`);
        if (data.success) {
          setResults(Array.isArray(data.data) ? data.data : data.data ? [data.data] : []);
        }
      } catch (err) {
        setResults([]);
        setError(getApiErrorMessage(err, "Unable to search student records."));
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  async function createVisit(student: StudentResult) {
    if (creatingVisitFor) return;

    setCreatingVisitFor(student.id);
    setError("");
    setStatusMessage("");

    try {
      const { data } = await apiClient.post("/reception/visits/", {
        matric_number: student.matric_number,
        chief_complaint: "Reception intake",
        symptoms_summary: "",
        priority: student.summary.active_emergency ? "emergency" : "normal",
        reception_notes: "Created from reception workspace patient search",
      });

      if (data.success) {
        setStatusMessage(`Visit ${data.data.visit_number} created for ${student.full_name} and added to the nurse queue.`);
        setQuery("");
        setResults([]);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to create the visit."));
    } finally {
      setCreatingVisitFor(null);
    }
  }

  return (
    <DashboardShell title="Reception" subtitle="Search registered students and start visit intake" navItems={HOSPITAL_NAV.receptionist}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-teal-600" />
              Student Search
            </CardTitle>
            <CardDescription>Search by matric number or name against the shared student database.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {statusMessage && <p className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-700">{statusMessage}</p>}
            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <Input
              placeholder="Search by matric number or student name"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setError("");
              }}
            />

            {loading && <p className="text-sm text-slate-500">Searching student records...</p>}
            {!loading && !error && results.length === 0 && (
              <p className="text-sm text-slate-500">
                {query.trim() ? "No matching students found." : "No registered students available yet."}
              </p>
            )}

            <div className="space-y-3">
              {results.map((student) => (
                <div key={student.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{student.full_name}</p>
                      <p className="text-sm text-slate-600">{student.matric_number}</p>
                      <p className="text-xs text-slate-500">
                        {student.faculty} | {student.department} | Level {student.level}
                      </p>
                    </div>
                    <Button type="button" onClick={() => void createVisit(student)} disabled={creatingVisitFor !== null}>
                      {creatingVisitFor === student.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {creatingVisitFor === student.id ? "Creating visit..." : "Create Visit"}
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                    <p>Previous visits: {student.summary.previous_visits_count}</p>
                    <p>Emergency flag: {student.summary.active_emergency ? "Active" : "None"}</p>
                    <p>Verified flags: {student.summary.verified_flags.length ? student.summary.verified_flags.join(", ") : "None"}</p>
                  </div>
                  {student.summary.latest_visit && (
                    <p className="mt-2 text-xs text-slate-500">
                      Last visit: {student.summary.latest_visit.visit_number} | {student.summary.latest_visit.status}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
