"use client";

import { Activity, Clock3, FileText, FlaskConical, History, Loader2, RefreshCcw, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { apiClient } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { HOSPITAL_NAV } from "@/lib/hospital/nav-config";
import { formatDateTime } from "@/lib/utils";

type LabStatus = "pending" | "in_progress" | "completed" | "cancelled";
type LabPriority = "routine" | "urgent";
type LabFilter = LabStatus | "urgent" | "";
type LabSort = "oldest" | "newest";

interface LabRequest {
  id: string;
  visit: string;
  visit_number: string;
  request_number: string;
  status: LabStatus;
  priority: LabPriority;
  student_id: string;
  student_name: string;
  matric_number: string;
  requested_by: string;
  test_count: number;
  completed_test_count: number;
  clinical_notes: string;
  requested_at: string;
  completed_at: string | null;
}

interface QueuePayload {
  stats: { active: number; pending: number; completed: number; today: number };
  requests: LabRequest[];
}

const emptyStats = { active: 0, pending: 0, completed: 0, today: 0 };

function statusVariant(status: LabStatus | LabPriority) {
  if (status === "completed") return "default" as const;
  if (status === "in_progress" || status === "urgent") return "warning" as const;
  if (status === "cancelled") return "destructive" as const;
  return "secondary" as const;
}

function minutesBetween(start: string, end: string) {
  return Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

function formatDuration(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0 min";
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function averageProcessingTime(requests: LabRequest[]) {
  const completed = requests.filter((request) => request.completed_at);
  if (completed.length === 0) return "0 min";
  const average = Math.round(
    completed.reduce((total, request) => total + minutesBetween(request.requested_at, request.completed_at ?? request.requested_at), 0) /
      completed.length
  );
  return formatDuration(average);
}

function completedTodayCount(requests: LabRequest[]) {
  const today = new Date().toDateString();
  return requests.filter((request) => request.completed_at && new Date(request.completed_at).toDateString() === today).length;
}

export default function LaboratoryQueueDashboardPage() {
  const [requests, setRequests] = useState<LabRequest[]>([]);
  const [stats, setStats] = useState(emptyStats);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LabFilter>("");
  const [sort, setSort] = useState<LabSort>("oldest");
  const [error, setError] = useState("");

  const loadQueue = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const { data } = await apiClient.get("/lab/queue/");
      if (data.success) {
        const payload = data.data as QueuePayload;
        setStats(payload.stats ?? emptyStats);
        setRequests(payload.requests ?? []);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load laboratory queue."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadQueue(true), 0);
    return () => window.clearTimeout(timer);
  }, [loadQueue]);

  useRealtimeRefresh(loadQueue, ["lab.", "consultation.saved"]);

  const filteredRequests = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return requests
      .filter((request) => {
        const matchesSearch =
          !normalized ||
          request.request_number.toLowerCase().includes(normalized) ||
          request.student_name.toLowerCase().includes(normalized) ||
          request.matric_number.toLowerCase().includes(normalized);
        const matchesFilter =
          !filter ||
          (filter === "urgent" && request.priority === "urgent") ||
          (filter !== "urgent" && request.status === filter);
        return matchesSearch && matchesFilter;
      })
      .sort((first, second) => {
        const firstTime = new Date(first.requested_at).getTime();
        const secondTime = new Date(second.requested_at).getTime();
        return sort === "oldest" ? firstTime - secondTime : secondTime - firstTime;
      });
  }, [filter, query, requests, sort]);

  const urgentCount = requests.filter((request) => request.priority === "urgent" && request.status !== "completed").length;

  return (
    <DashboardShell title="Laboratory Queue" subtitle="Diagnostic request dashboard" navItems={HOSPITAL_NAV.lab_technician} hideSidebar>
      <div className="space-y-6">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Laboratory Queue Dashboard</p>
            <h2 className="text-2xl font-semibold text-slate-950">Incoming Diagnostic Requests</h2>
            <p className="text-sm text-slate-500">Queue management only. Open a request to enter results.</p>
          </div>
          <Button type="button" variant="outline" onClick={() => void loadQueue(false)} disabled={refreshing || loading}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Refresh
          </Button>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard icon={<Activity className="h-5 w-5 text-teal-700" />} label="Pending Requests" value={stats.pending.toString()} />
          <StatCard icon={<FlaskConical className="h-5 w-5 text-amber-700" />} label="Urgent Requests" value={urgentCount.toString()} />
          <StatCard icon={<FileText className="h-5 w-5 text-teal-700" />} label="Completed Today" value={completedTodayCount(requests).toString()} />
          <StatCard icon={<Clock3 className="h-5 w-5 text-slate-700" />} label="Average Processing Time" value={averageProcessingTime(requests)} />
        </section>

        <Card>
          <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" placeholder="Search request number, student, or matric number" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={filter} onChange={(event) => setFilter(event.target.value as LabFilter)}>
              <option value="">All requests</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="urgent">Urgent</option>
            </select>
            <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={sort} onChange={(event) => setSort(event.target.value as LabSort)}>
              <option value="oldest">Oldest First</option>
              <option value="newest">Newest First</option>
            </select>
          </CardContent>
        </Card>

        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {loading && <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading laboratory queue...</p>}
        {!loading && filteredRequests.length === 0 && <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">No laboratory requests match the current filters.</p>}

        <section className="grid gap-4 xl:grid-cols-2">
          {filteredRequests.map((request) => (
            <Card key={request.id}>
              <CardHeader className="border-b border-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{request.request_number}</CardTitle>
                    <CardDescription>{request.student_name} · {request.matric_number}</CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={statusVariant(request.priority)}>{request.priority}</Badge>
                    <Badge variant={statusVariant(request.status)}>{request.status.replace("_", " ")}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <Info label="Visit ID" value={request.visit_number} />
                  <Info label="Requested Tests" value={`${request.test_count} test(s)`} />
                  <Info label="Requested By" value={request.requested_by || "Clinical team"} />
                  <Info label="Request Date" value={formatDateTime(request.requested_at)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href={`/hospital/lab/request/${request.id}`}>Start Test</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/hospital/lab/history/${request.student_id}`}><History className="h-4 w-4" /> View History</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </DashboardShell>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-full bg-slate-100 p-2">{icon}</div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-900">{value}</p>
    </div>
  );
}
