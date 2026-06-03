"use client";

import { ArrowLeft, ClipboardList, FlaskConical, History, Loader2, Paperclip, Save, Upload } from "lucide-react";
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
import { getNotificationsWebSocketUrl } from "@/lib/realtime";
import { formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

type LabStatus = "pending" | "in_progress" | "completed" | "cancelled";
type LabPriority = "routine" | "urgent";

interface LabStudent {
  id: string;
  full_name: string;
  matric_number: string;
  date_of_birth?: string | null;
  gender: string;
  blood_group?: string;
  department: string;
  faculty: string;
  level: string;
}

interface LabTest {
  id: string;
  test_name: string;
  test_code: string;
  result_value: string;
  reference_range: string;
  interpretation: string;
  technician_notes: string;
  comments: string;
  attachment_url: string;
  status: LabStatus;
  completed_at: string | null;
  performed_by_name: string;
}

interface LabRequest {
  id: string;
  visit: string;
  visit_number: string;
  request_number: string;
  status: LabStatus;
  priority: LabPriority;
  student: LabStudent;
  student_id: string;
  student_name: string;
  matric_number: string;
  requested_by: string;
  test_count: number;
  completed_test_count: number;
  clinical_notes: string;
  requested_at: string;
  completed_at: string | null;
  result_summary: string;
  result_file_url: string;
  tests: LabTest[];
}

type ResultDraft = Pick<LabTest, "result_value" | "reference_range" | "interpretation" | "technician_notes" | "comments" | "status"> & {
  attachment: File | null;
};

function statusVariant(status: LabStatus | LabPriority) {
  if (status === "completed") return "default" as const;
  if (status === "in_progress" || status === "urgent") return "warning" as const;
  if (status === "cancelled") return "destructive" as const;
  return "secondary" as const;
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

function createDrafts(request: LabRequest | null): Record<string, ResultDraft> {
  if (!request) return {};
  return Object.fromEntries(
    request.tests.map((test) => [
      test.id,
      {
        result_value: test.result_value ?? "",
        reference_range: test.reference_range ?? "",
        interpretation: test.interpretation ?? "",
        technician_notes: test.technician_notes ?? "",
        comments: test.comments ?? "",
        status: test.status === "completed" ? "completed" : "in_progress",
        attachment: null,
      },
    ])
  );
}

export default function LabRequestWorkspacePage() {
  const params = useParams<{ requestId: string }>();
  const router = useRouter();
  const { workstation, user } = useAuthStore();
  const requestId = params.requestId;
  const [request, setRequest] = useState<LabRequest | null>(null);
  const [history, setHistory] = useState<LabRequest[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ResultDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingTestId, setSavingTestId] = useState("");
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  async function loadRequest(showLoading = true) {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const { data } = await apiClient.get(`/lab/requests/${requestId}/`);
      if (data.success) {
        const labRequest = data.data as LabRequest;
        setRequest(labRequest);
        setDrafts(createDrafts(labRequest));
        const historyRes = await apiClient.get(`/lab/students/${labRequest.student_id}/history/`);
        if (historyRes.data.success) setHistory(historyRes.data.data);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load lab request."));
    } finally {
      setLoading(false);
    }
  }

  const refreshRequest = useEffectEvent((showLoading = false) => {
    void loadRequest(showLoading);
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshRequest(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [requestId]);

  useEffect(() => {
    const socketUrl = getNotificationsWebSocketUrl();
    if (!socketUrl) return;
    const socket = new WebSocket(socketUrl);
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { event?: string };
      if (payload.event?.startsWith("lab.")) {
        refreshRequest(false);
      }
    };
    return () => socket.close();
  }, []);

  function updateDraft(testId: string, field: keyof ResultDraft, value: string | File | null) {
    setDrafts((current) => ({
      ...current,
      [testId]: {
        ...current[testId],
        [field]: value,
      },
    }));
  }

  async function saveTest(test: LabTest, status: "in_progress" | "completed") {
    if (!request) return;
    const draft = drafts[test.id];
    setSavingTestId(test.id);
    setError("");
    setStatusMessage("");
    try {
      const body = new FormData();
      body.set("result_value", draft.result_value);
      body.set("reference_range", draft.reference_range);
      body.set("interpretation", draft.interpretation);
      body.set("technician_notes", draft.technician_notes);
      body.set("comments", draft.comments);
      body.set("status", status);
      if (draft.attachment) body.set("attachment", draft.attachment);
      await apiClient.post(`/lab/requests/${request.id}/tests/${test.id}/results/`, body);
      setStatusMessage(`${test.test_name} ${status === "completed" ? "completed" : "draft saved"}.`);
      await loadRequest(false);
    } catch (err) {
      setError(getApiErrorMessage(err, `Unable to save ${test.test_name}.`));
    } finally {
      setSavingTestId("");
    }
  }

  async function completeRequest() {
    if (!request) return;
    setCompleting(true);
    setError("");
    setStatusMessage("");
    try {
      await apiClient.post(`/lab/requests/${request.id}/results/`, {
        tests: request.tests.map((test) => ({ test_id: test.id, ...drafts[test.id], status: "completed", attachment: undefined })),
      });
      setStatusMessage(`${request.request_number} completed and released.`);
      window.setTimeout(() => router.push("/hospital/lab"), 700);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to complete lab request."));
    } finally {
      setCompleting(false);
    }
  }

  const allTestsCompleted = useMemo(
    () => Boolean(request?.tests.length) && request!.tests.every((test) => (drafts[test.id]?.status ?? test.status) === "completed"),
    [drafts, request]
  );

  if (loading) {
    return (
      <DashboardShell title="Lab Request" subtitle="Loading diagnostics workspace" navItems={HOSPITAL_NAV.lab_technician} hideSidebar>
        <Card><CardContent className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading lab request...</CardContent></Card>
      </DashboardShell>
    );
  }

  if (!request) {
    return (
      <DashboardShell title="Lab Request" subtitle="Request unavailable" navItems={HOSPITAL_NAV.lab_technician} hideSidebar>
        <Card><CardContent className="space-y-4 p-6"><p className="text-sm text-red-700">{error || "Unable to load request."}</p><Button asChild variant="outline"><Link href="/hospital/lab">Return to Lab Queue</Link></Button></CardContent></Card>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Lab Request Workspace" subtitle="Individual diagnostic processing" navItems={HOSPITAL_NAV.lab_technician} hideSidebar>
      <div className="space-y-6">
        <header className="sticky top-16 z-30 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold text-slate-950">{request.student_name}</h2>
                <Badge variant={statusVariant(request.priority)}>{request.priority}</Badge>
                <Badge variant={statusVariant(request.status)}>{request.status.replace("_", " ")}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {request.matric_number} · Visit {request.visit_number} · {request.request_number} · {formatDateTime(request.requested_at)} · Requested by {request.requested_by || "Clinical team"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline"><Link href="/hospital/lab"><ArrowLeft className="h-4 w-4" /> Back to Queue</Link></Button>
              <Button type="button" onClick={() => void completeRequest()} disabled={!allTestsCompleted || completing}>
                {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Complete Lab Request
              </Button>
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
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Info label="Full Name" value={request.student.full_name} />
                <Info label="Matric Number" value={request.student.matric_number} />
                <Info label="Age" value={calculateAge(request.student.date_of_birth)} />
                <Info label="Gender" value={request.student.gender || "N/A"} />
                <Info label="Blood Group" value={request.student.blood_group || "N/A"} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-teal-700" /> Previous Lab History</CardTitle>
                <CardDescription>Last 10 laboratory requests.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {history.filter((item) => item.id !== request.id).slice(0, 10).length === 0 && <p className="rounded-md bg-slate-50 p-3 text-slate-500">No previous lab requests.</p>}
                {history.filter((item) => item.id !== request.id).slice(0, 10).map((item) => (
                  <Link key={item.id} href={`/hospital/lab/history/${request.student_id}`} className="block rounded-md border border-slate-200 p-3 hover:border-teal-300 hover:bg-teal-50">
                    <p className="font-medium text-slate-900">{item.test_count} test(s)</p>
                    <p className="text-xs text-slate-500">{formatDateTime(item.requested_at)} · {item.status}</p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </aside>

          <main className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-teal-700" /> Laboratory Tests</CardTitle>
                <CardDescription>Each test has independent status, result entry, notes, and attachment.</CardDescription>
              </CardHeader>
            </Card>

            {request.tests.map((test) => {
              const draft = drafts[test.id];
              return (
                <Card key={test.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <div>
                      <CardTitle>{test.test_name}</CardTitle>
                      <CardDescription>{test.test_code || "No test code"} · {test.performed_by_name || "Awaiting technician"}</CardDescription>
                    </div>
                    <Badge variant={statusVariant(draft?.status ?? test.status)}>{(draft?.status ?? test.status).replace("_", " ")}</Badge>
                  </CardHeader>
                  <CardContent className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={draft?.status ?? "in_progress"} onChange={(event) => updateDraft(test.id, "status", event.target.value)}>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <TextField label="Reference Range" value={draft?.reference_range ?? ""} onChange={(value) => updateDraft(test.id, "reference_range", value)} />
                    <TextArea label="Result Value" value={draft?.result_value ?? ""} onChange={(value) => updateDraft(test.id, "result_value", value)} />
                    <TextArea label="Interpretation" value={draft?.interpretation ?? ""} onChange={(value) => updateDraft(test.id, "interpretation", value)} />
                    <TextArea label="Technician Notes" value={draft?.technician_notes ?? ""} onChange={(value) => updateDraft(test.id, "technician_notes", value)} />
                    <TextArea label="Additional Comments" value={draft?.comments ?? ""} onChange={(value) => updateDraft(test.id, "comments", value)} />
                    <div className="space-y-2 lg:col-span-2">
                      <Label htmlFor={`${test.id}-attachment`}>Attachment Upload (PDF, JPG, PNG)</Label>
                      <Input id={`${test.id}-attachment`} type="file" accept=".pdf,image/jpeg,image/png" onChange={(event) => updateDraft(test.id, "attachment", event.target.files?.[0] ?? null)} />
                      {test.attachment_url && <a href={test.attachment_url} className="inline-flex items-center gap-1 text-sm text-teal-700" target="_blank" rel="noreferrer"><Paperclip className="h-4 w-4" /> Existing attachment</a>}
                    </div>
                    <div className="flex flex-wrap gap-2 lg:col-span-2">
                      <Button type="button" variant="outline" onClick={() => void saveTest(test, "in_progress")} disabled={savingTestId === test.id}>
                        {savingTestId === test.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Draft
                      </Button>
                      <Button type="button" onClick={() => void saveTest(test, "completed")} disabled={savingTestId === test.id}>
                        Mark Completed
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-teal-700" /> Laboratory Report Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {request.tests.map((test) => {
                  const draft = drafts[test.id] ?? test;
                  return (
                    <div key={`preview-${test.id}`} className="rounded-md border border-slate-200 p-3">
                      <p className="font-semibold text-slate-950">{test.test_name}</p>
                      <p><span className="font-medium">Result:</span> {draft.result_value || "Pending"}</p>
                      <p><span className="font-medium">Reference:</span> {draft.reference_range || "N/A"}</p>
                      <p><span className="font-medium">Interpretation:</span> {draft.interpretation || "N/A"}</p>
                      <p><span className="font-medium">Technician Notes:</span> {draft.technician_notes || "N/A"}</p>
                    </div>
                  );
                })}
                <p className="text-xs text-slate-500">Lab Officer: {workstation?.station_name ?? user?.username} · Date: {formatDateTime(new Date())}</p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </DashboardShell>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <textarea id={id} className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500" value={value} onChange={(event) => onChange(event.target.value)} />
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
