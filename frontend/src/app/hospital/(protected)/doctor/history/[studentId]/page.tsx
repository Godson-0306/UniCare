"use client";

import { ArrowLeft, History, Loader2, Search, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useEffectEvent, useMemo, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
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
  priority: string;
  chief_complaint: string;
  registered_at: string;
  student: {
    id: string;
    full_name: string;
    matric_number: string;
    department: string;
    faculty: string;
    level: string;
  };
  consultation?: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    diagnosis: string;
    follow_up_notes: string;
    created_at: string;
  } | null;
}

interface TimelineItem {
  kind: string;
  title: string;
  status: string;
  timestamp: string;
  visit_id?: string | null;
  details?: Record<string, unknown>;
}

interface MedicalRecord {
  id: string;
  title: string;
  details: string;
  record_type: string;
  created_at: string;
}

export default function DoctorPatientHistoryPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId;
  const [history, setHistory] = useState<VisitDetail[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<VisitDetail | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = useEffectEvent(async () => {
    setLoading(true);
    setError("");
    try {
      const [historyRes, timelineRes, profileRes] = await Promise.all([
        apiClient.get(`/doctor/students/${studentId}/history/`),
        apiClient.get(`/doctor/students/${studentId}/timeline/`),
        apiClient.get(`/doctor/students/${studentId}/medical-profile/`),
      ]);
      if (historyRes.data.success) setHistory(historyRes.data.data);
      if (timelineRes.data.success) setTimeline(timelineRes.data.data);
      if (profileRes.data.success) setRecords(profileRes.data.data.records);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load patient consultation history."));
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

  const student = history[0]?.student;
  const filteredHistory = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return history;
    return history.filter((visit) =>
      [visit.visit_number, visit.chief_complaint, visit.consultation?.diagnosis, visit.consultation?.assessment]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [history, query]);

  return (
    <DashboardShell title="Patient History" subtitle="Doctor consultation viewer" navItems={HOSPITAL_NAV.doctor} hideSidebar>
      <div className="space-y-6">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Consultation History</p>
            <h2 className="text-2xl font-semibold text-slate-950">{student?.full_name ?? "Patient Record"}</h2>
            <p className="text-sm text-slate-500">{student ? `${student.matric_number} · ${student.department}` : "Review prior visits and linked clinical events."}</p>
          </div>
          <Button asChild variant="outline"><Link href="/hospital/doctor"><ArrowLeft className="h-4 w-4" /> Back to Queue</Link></Button>
        </header>

        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Verified Medical Profile</CardTitle>
                <CardDescription>Allergies, chronic illnesses, diagnoses, and special notes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {records.length === 0 && <p className="rounded-md bg-slate-50 p-3 text-slate-500">No verified records found.</p>}
                {records.map((record) => (
                  <div key={record.id} className="rounded-md border border-slate-200 p-3">
                    <p className="text-xs uppercase tracking-wide text-teal-700">{record.record_type.replaceAll("_", " ")}</p>
                    <p className="font-medium text-slate-900">{record.title}</p>
                    {record.details && <p className="mt-1 text-slate-600">{record.details}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          </aside>

          <main className="space-y-4">
            <Card>
              <CardContent className="relative p-4">
                <Search className="absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input className="pl-9" placeholder="Search diagnosis, complaint, or visit ID" value={query} onChange={(event) => setQuery(event.target.value)} />
              </CardContent>
            </Card>
            {loading && <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading history...</p>}
            {!loading && filteredHistory.length === 0 && <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">No consultations found.</p>}
            {filteredHistory.map((visit) => (
              <Card key={visit.id}>
                <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{formatDateTime(visit.registered_at)} · {visit.visit_number}</p>
                    <p className="text-sm text-slate-600">{visit.chief_complaint || "No chief complaint recorded."}</p>
                    <p className="mt-1 text-sm text-teal-700">{visit.consultation?.diagnosis || visit.consultation?.assessment || "No diagnosis recorded."}</p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setSelectedVisit(visit)}>
                    <History className="h-4 w-4" />
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </main>
        </div>

        {selectedVisit && <HistoryModal visit={selectedVisit} timeline={timeline.filter((item) => item.visit_id === selectedVisit.id)} onClose={() => setSelectedVisit(null)} />}
      </div>
    </DashboardShell>
  );
}

function HistoryModal({ visit, timeline, onClose }: { visit: VisitDetail; timeline: TimelineItem[]; onClose: () => void }) {
  const consultation = visit.consultation;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 md:items-center md:p-6">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl md:rounded-2xl">
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-slate-200 bg-white p-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{visit.visit_number}</h3>
            <p className="text-sm text-slate-500">{formatDateTime(visit.registered_at)}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <Info label="Diagnosis" value={consultation?.diagnosis || consultation?.assessment || "N/A"} />
          <Info label="Physical Examination" value={consultation?.objective || "N/A"} />
          <Info label="Treatment Plan" value={consultation?.plan || "N/A"} />
          <Info label="Follow-up Notes" value={consultation?.follow_up_notes || "N/A"} />
          <section className="space-y-2 md:col-span-2">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Linked Clinical Events</h4>
            {timeline.length === 0 && <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-500">No linked timeline events.</p>}
            {timeline.map((item, index) => (
              <div key={`${item.kind}-${index}`} className="rounded-md border border-slate-200 p-3 text-sm">
                <p className="font-semibold text-slate-900">{item.title}</p>
                <p className="text-xs text-teal-700">{item.kind} · {item.status} · {formatDateTime(item.timestamp)}</p>
                {typeof item.details?.summary !== "undefined" && <p className="mt-2 whitespace-pre-line text-slate-600">{String(item.details.summary)}</p>}
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-line text-sm text-slate-900">{value}</p>
    </div>
  );
}
