"use client";

import { Activity, ClipboardList, FileText, FlaskConical, Loader2, Printer, RefreshCcw, Save, Search } from "lucide-react";
import { useEffect, useEffectEvent, useState } from "react";
import type { ReactNode } from "react";

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

interface LabTest {
  id: string;
  test_name: string;
  test_code: string;
  result_value: string;
  reference_range: string;
  comments: string;
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
  student_name: string;
  matric_number: string;
  requested_by: string;
  test_count: number;
  completed_test_count: number;
  clinical_notes: string;
  requested_at: string;
  completed_at: string | null;
  tests: LabTest[];
}

interface QueuePayload {
  stats: { active: number; pending: number; completed: number; today: number };
  requests: LabRequest[];
}

type ResultDraft = Pick<LabTest, "result_value" | "reference_range" | "comments" | "status">;

const emptyStats = { active: 0, pending: 0, completed: 0, today: 0 };

function statusVariant(status: LabStatus) {
  if (status === "completed") return "default" as const;
  if (status === "in_progress") return "warning" as const;
  if (status === "cancelled") return "destructive" as const;
  return "secondary" as const;
}

function createDrafts(request: LabRequest | null): Record<string, ResultDraft> {
  if (!request) return {};
  return Object.fromEntries(
    request.tests.map((test) => [
      test.id,
      {
        result_value: test.result_value ?? "",
        reference_range: test.reference_range ?? "",
        comments: test.comments ?? "",
        status: test.status === "completed" ? "completed" : "in_progress",
      },
    ])
  );
}

export default function LaboratoryWorkspacePage() {
  const { workstation, user } = useAuthStore();
  const [requests, setRequests] = useState<LabRequest[]>([]);
  const [stats, setStats] = useState(emptyStats);
  const [selectedRequest, setSelectedRequest] = useState<LabRequest | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ResultDraft>>({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LabStatus | "">("");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingTestId, setSavingTestId] = useState("");
  const [submittingAll, setSubmittingAll] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  async function loadQueue() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (dateFilter) params.set("date", dateFilter);
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const { data } = await apiClient.get(`/lab/queue/${suffix}`);
      if (data.success) {
        const payload = data.data as QueuePayload;
        setStats(payload.stats ?? emptyStats);
        setRequests(payload.requests ?? []);
        setSelectedRequest((current) => {
          const nextSelected = payload.requests.find((request) => request.id === current?.id) ?? payload.requests[0] ?? null;
          setDrafts(createDrafts(nextSelected));
          return nextSelected;
        });
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load laboratory requests."));
    } finally {
      setLoading(false);
    }
  }

  const refreshQueue = useEffectEvent(() => {
    void loadQueue();
  });

  useEffect(() => {
    const timer = window.setTimeout(refreshQueue, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const socketUrl = getNotificationsWebSocketUrl();
    if (!socketUrl) return;

    const socket = new WebSocket(socketUrl);
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { event?: string };
      if (payload.event?.startsWith("lab.") || payload.event === "consultation.saved") {
        refreshQueue();
      }
    };

    return () => socket.close();
  }, []);

  function selectRequest(request: LabRequest) {
    setSelectedRequest(request);
    setDrafts(createDrafts(request));
    setStatusMessage("");
    setError("");
  }

  function updateDraft(testId: string, field: keyof ResultDraft, value: string) {
    setDrafts((current) => ({
      ...current,
      [testId]: {
        ...current[testId],
        [field]: value,
      },
    }));
  }

  async function saveTest(test: LabTest) {
    if (!selectedRequest) return;
    const draft = drafts[test.id];
    setSavingTestId(test.id);
    setError("");
    setStatusMessage("");
    try {
      await apiClient.post(`/lab/requests/${selectedRequest.id}/tests/${test.id}/results/`, draft);
      setStatusMessage(`${test.test_name} result saved.`);
      await loadQueue();
    } catch (err) {
      setError(getApiErrorMessage(err, `Unable to save ${test.test_name} result.`));
    } finally {
      setSavingTestId("");
    }
  }

  async function submitAllTests() {
    if (!selectedRequest) return;
    setSubmittingAll(true);
    setError("");
    setStatusMessage("");
    try {
      await apiClient.post(`/lab/requests/${selectedRequest.id}/results/`, {
        tests: selectedRequest.tests.map((test) => ({ test_id: test.id, ...drafts[test.id], status: "completed" })),
      });
      setStatusMessage(`${selectedRequest.request_number} completed and released.`);
      await loadQueue();
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to submit all lab results."));
    } finally {
      setSubmittingAll(false);
    }
  }

  const activeQueue = requests
    .filter((request) => request.status === "pending" || request.status === "in_progress")
    .sort((first, second) => new Date(first.requested_at).getTime() - new Date(second.requested_at).getTime());

  return (
    <DashboardShell
      title="Laboratory Workspace"
      subtitle="FIFO diagnostics, result entry, and printable reports"
      navItems={HOSPITAL_NAV.lab_technician}
      hideSidebar
    >
      <div className="space-y-6">
        <section className="grid gap-3 md:grid-cols-4">
          <SummaryCard title="Active Requests" value={stats.active} icon={<Activity className="h-5 w-5" />} />
          <SummaryCard title="Pending Requests" value={stats.pending} icon={<ClipboardList className="h-5 w-5" />} />
          <SummaryCard title="Completed Requests" value={stats.completed} icon={<FileText className="h-5 w-5" />} />
          <SummaryCard title="Today's Tests" value={stats.today} icon={<FlaskConical className="h-5 w-5" />} />
        </section>

        <Card>
          <CardContent className="grid gap-3 pt-6 lg:grid-cols-[1fr_180px_180px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input className="pl-9" placeholder="Search request, student, or matric number" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as LabStatus | "")}>
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
            <Button type="button" variant="outline" onClick={() => void loadQueue()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Apply
            </Button>
          </CardContent>
        </Card>

        {(error || statusMessage) && (
          <div className="space-y-2">
            {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {statusMessage && <p className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">{statusMessage}</p>}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.4fr]">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Lab Queue</h2>
                <p className="text-sm text-slate-500">Oldest pending request first.</p>
              </div>
              <Badge variant="secondary">{activeQueue.length} active</Badge>
            </div>

            {loading && <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading laboratory queue...</p>}
            {!loading && activeQueue.length === 0 && <p className="rounded-md border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">No active lab requests match the current filters.</p>}

            <div className="space-y-3">
              {activeQueue.map((request) => (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => selectRequest(request)}
                  className={`w-full rounded-lg border bg-white p-4 text-left transition hover:border-teal-300 hover:bg-teal-50 ${
                    selectedRequest?.id === request.id ? "border-teal-400 ring-2 ring-teal-100" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{request.student_name}</p>
                      <p className="text-sm text-slate-500">{request.matric_number}</p>
                    </div>
                    <Badge variant={statusVariant(request.status)}>{request.status.replace("_", " ")}</Badge>
                  </div>
                  <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                    <p><span className="font-medium text-slate-700">Request:</span> {request.request_number}</p>
                    <p><span className="font-medium text-slate-700">Tests:</span> {request.completed_test_count}/{request.test_count}</p>
                    <p><span className="font-medium text-slate-700">Requested:</span> {formatDateTime(request.requested_at)}</p>
                    <p><span className="font-medium text-slate-700">Doctor:</span> {request.requested_by || "Clinical team"}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            {!selectedRequest && <Card><CardContent className="p-6 text-sm text-slate-500">Select a lab request to begin processing.</CardContent></Card>}
            {selectedRequest && (
              <>
                <Card>
                  <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <CardTitle>Lab Processing Panel</CardTitle>
                      <CardDescription>{selectedRequest.request_number} | {selectedRequest.visit_number}</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => window.print()}>
                        <Printer className="h-4 w-4" />
                        Generate Lab Report
                      </Button>
                      <Button type="button" onClick={() => void submitAllTests()} disabled={submittingAll}>
                        {submittingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Submit All Tests
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4 lg:grid-cols-3">
                    <InfoBlock label="Patient" value={selectedRequest.student_name} helper={selectedRequest.matric_number} />
                    <InfoBlock label="Request" value={selectedRequest.request_number} helper={formatDateTime(selectedRequest.requested_at)} />
                    <InfoBlock label="Requested By" value={selectedRequest.requested_by || "Clinical team"} helper={`${selectedRequest.test_count} requested test(s)`} />
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  {selectedRequest.tests.map((test) => {
                    const draft = drafts[test.id] ?? { result_value: "", reference_range: "", comments: "", status: "in_progress" };
                    return (
                      <Card key={test.id} className="border-slate-200">
                        <CardHeader className="flex flex-row items-start justify-between gap-4">
                          <div>
                            <CardTitle className="text-base">{test.test_name}</CardTitle>
                            <CardDescription>{test.test_code || "No test code"} | {test.performed_by_name || "Awaiting lab officer"}</CardDescription>
                          </div>
                          <Badge variant={statusVariant(test.status)}>{test.status.replace("_", " ")}</Badge>
                        </CardHeader>
                        <CardContent className="grid gap-4 lg:grid-cols-2">
                          <div className="space-y-2 lg:col-span-2">
                            <Label htmlFor={`${test.id}-result`}>Result</Label>
                            <textarea id={`${test.id}-result`} className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500" value={draft.result_value} onChange={(event) => updateDraft(test.id, "result_value", event.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`${test.id}-reference`}>Reference Range</Label>
                            <Input id={`${test.id}-reference`} value={draft.reference_range} onChange={(event) => updateDraft(test.id, "reference_range", event.target.value)} placeholder="Optional" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`${test.id}-status`}>Status</Label>
                            <select id={`${test.id}-status`} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={draft.status} onChange={(event) => updateDraft(test.id, "status", event.target.value)}>
                              <option value="in_progress">In progress</option>
                              <option value="completed">Completed</option>
                            </select>
                          </div>
                          <div className="space-y-2 lg:col-span-2">
                            <Label htmlFor={`${test.id}-comments`}>Comments</Label>
                            <textarea id={`${test.id}-comments`} className="min-h-20 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500" value={draft.comments} onChange={(event) => updateDraft(test.id, "comments", event.target.value)} />
                          </div>
                          <Button type="button" variant="outline" className="lg:col-span-2" onClick={() => void saveTest(test)} disabled={savingTestId === test.id}>
                            {savingTestId === test.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Individual Test Result
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <Card className="print:border-0 print:shadow-none">
                  <CardHeader>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">UniCare University Health Centre</p>
                    <CardTitle>Laboratory Report</CardTitle>
                    <CardDescription>{selectedRequest.student_name} | {selectedRequest.matric_number} | {selectedRequest.request_number}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    {selectedRequest.tests.map((test) => {
                      const draft = drafts[test.id] ?? test;
                      return (
                        <div key={`report-${test.id}`} className="rounded-md border border-slate-200 p-3">
                          <p className="font-semibold text-slate-950">{test.test_name}</p>
                          <p><span className="font-medium">Result:</span> {draft.result_value || "Pending"}</p>
                          <p><span className="font-medium">Reference:</span> {draft.reference_range || "N/A"}</p>
                          <p><span className="font-medium">Comments:</span> {draft.comments || "N/A"}</p>
                        </div>
                      );
                    })}
                    <p className="text-xs text-slate-500">Lab Officer: {workstation?.station_name ?? user?.username} | Date: {formatDateTime(new Date())}</p>
                  </CardContent>
                </Card>
              </>
            )}
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: number; icon: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        <div className="rounded-lg bg-teal-50 p-3 text-teal-700">{icon}</div>
      </CardContent>
    </Card>
  );
}

function InfoBlock({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
      <p className="text-sm text-slate-500">{helper}</p>
    </div>
  );
}
