"use client";

import { ArrowLeft, FlaskConical, Loader2, Search, X } from "lucide-react";
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

type LabStatus = "pending" | "in_progress" | "completed" | "cancelled";

interface LabTest {
  id: string;
  test_name: string;
  result_value: string;
  reference_range: string;
  interpretation: string;
  technician_notes: string;
  comments: string;
  attachment_url: string;
  status: LabStatus;
  completed_at: string | null;
}

interface LabRequest {
  id: string;
  visit_number: string;
  request_number: string;
  status: LabStatus;
  priority: "routine" | "urgent";
  student_name: string;
  matric_number: string;
  requested_by: string;
  test_count: number;
  requested_at: string;
  completed_at: string | null;
  result_summary: string;
  result_file_url: string;
  tests: LabTest[];
}

function statusVariant(status: LabStatus) {
  if (status === "completed") return "default" as const;
  if (status === "in_progress") return "warning" as const;
  if (status === "cancelled") return "destructive" as const;
  return "secondary" as const;
}

export default function LabHistoryPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId;
  const [requests, setRequests] = useState<LabRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<LabRequest | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = useEffectEvent(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await apiClient.get(`/lab/students/${studentId}/history/`);
      if (data.success) setRequests(data.data as LabRequest[]);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load laboratory history."));
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

  const filteredRequests = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return requests;
    return requests.filter((request) =>
      [request.request_number, request.visit_number, request.student_name, request.matric_number, ...request.tests.map((test) => test.test_name)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [query, requests]);

  const patient = requests[0];

  return (
    <DashboardShell title="Lab History" subtitle="Chronological laboratory reports" navItems={HOSPITAL_NAV.lab_technician} hideSidebar>
      <div className="space-y-6">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Laboratory History Viewer</p>
            <h2 className="text-2xl font-semibold text-slate-950">{patient?.student_name ?? "Patient Lab History"}</h2>
            <p className="text-sm text-slate-500">{patient ? `${patient.matric_number} · ${filteredRequests.length} request(s)` : "Review all laboratory requests and reports."}</p>
          </div>
          <Button asChild variant="outline"><Link href="/hospital/lab"><ArrowLeft className="h-4 w-4" /> Back to Lab Queue</Link></Button>
        </header>

        <Card>
          <CardContent className="relative p-4">
            <Search className="absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Search request, visit ID, or test name" value={query} onChange={(event) => setQuery(event.target.value)} />
          </CardContent>
        </Card>

        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {loading && <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading lab history...</p>}
        {!loading && filteredRequests.length === 0 && <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">No laboratory history found.</p>}

        <section className="grid gap-4 xl:grid-cols-2">
          {filteredRequests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-teal-700" /> {request.request_number}</CardTitle>
                    <CardDescription>{request.visit_number} · {formatDateTime(request.requested_at)}</CardDescription>
                  </div>
                  <Badge variant={statusVariant(request.status)}>{request.status.replace("_", " ")}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Info label="Tests" value={request.tests.map((test) => test.test_name).join(", ") || `${request.test_count} test(s)`} />
                <Info label="Completion Date" value={request.completed_at ? formatDateTime(request.completed_at) : "Pending"} />
                <Info label="Result Summary" value={request.result_summary || "No released result summary yet."} />
                <Button type="button" variant="outline" onClick={() => setSelectedRequest(request)}>View Full Laboratory Report</Button>
              </CardContent>
            </Card>
          ))}
        </section>

        {selectedRequest && <ReportModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />}
      </div>
    </DashboardShell>
  );
}

function ReportModal({ request, onClose }: { request: LabRequest; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 md:items-center md:p-6">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl md:rounded-2xl">
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-slate-200 bg-white p-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Laboratory Report</h3>
            <p className="text-sm text-slate-500">{request.request_number} · {request.visit_number}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid gap-3 text-sm md:grid-cols-3">
            <Info label="Patient" value={`${request.student_name} · ${request.matric_number}`} />
            <Info label="Requested" value={formatDateTime(request.requested_at)} />
            <Info label="Completed" value={request.completed_at ? formatDateTime(request.completed_at) : "Pending"} />
          </div>
          {request.tests.map((test) => (
            <div key={test.id} className="rounded-md border border-slate-200 p-3 text-sm">
              <p className="font-semibold text-slate-950">{test.test_name}</p>
              <p><span className="font-medium">Status:</span> {test.status}</p>
              <p><span className="font-medium">Result:</span> {test.result_value || "Pending"}</p>
              <p><span className="font-medium">Reference:</span> {test.reference_range || "N/A"}</p>
              <p><span className="font-medium">Interpretation:</span> {test.interpretation || "N/A"}</p>
              <p><span className="font-medium">Technician Notes:</span> {test.technician_notes || "N/A"}</p>
              {test.attachment_url && <a href={test.attachment_url} className="mt-2 inline-block text-teal-700" target="_blank" rel="noreferrer">Open attachment</a>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-line text-slate-900">{value}</p>
    </div>
  );
}
