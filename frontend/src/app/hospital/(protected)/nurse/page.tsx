"use client";

import { AlertTriangle, Clock3, HeartPulse, History, Loader2, RefreshCcw, Search, UsersRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { HOSPITAL_NAV } from "@/lib/hospital/nav-config";
import { getNotificationsWebSocketUrl } from "@/lib/realtime";
import { formatDateTime } from "@/lib/utils";

interface NurseQueueVisit {
  id: string;
  visit_number: string;
  student_id: string;
  student_name: string;
  matric_number: string;
  status: string;
  priority: "normal" | "urgent" | "emergency";
  chief_complaint: string;
  registered_at: string;
  created_at: string;
  nurse_queue_entry_id: string | null;
  nurse_queue_status: string | null;
  nurse_queue_position: number;
}

type QueueFilter = "all" | "waiting" | "urgent" | "emergency";
type QueueSort = "oldest" | "newest";

function priorityVariant(priority: NurseQueueVisit["priority"]) {
  if (priority === "emergency") return "destructive" as const;
  if (priority === "urgent") return "warning" as const;
  return "secondary" as const;
}

function minutesWaiting(value: string) {
  const startedAt = new Date(value).getTime();
  if (Number.isNaN(startedAt)) return 0;
  return Math.max(0, Math.floor((Date.now() - startedAt) / 60000));
}

function formatWait(value: string) {
  const minutes = minutesWaiting(value);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function averageWait(queue: NurseQueueVisit[]) {
  if (queue.length === 0) return "0 min";
  const average = Math.round(queue.reduce((total, visit) => total + minutesWaiting(visit.registered_at || visit.created_at), 0) / queue.length);
  if (average < 60) return `${average} min`;
  return `${Math.floor(average / 60)}h ${average % 60}m`;
}

export default function NurseQueueDashboardPage() {
  const [queue, setQueue] = useState<NurseQueueVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [sort, setSort] = useState<QueueSort>("oldest");

  async function loadQueue(showLoading = true) {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const { data } = await apiClient.get("/nurse/queue/");
      if (data.success) setQueue(data.data as NurseQueueVisit[]);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load nurse queue."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const refreshQueue = useEffectEvent((showLoading = false) => {
    void loadQueue(showLoading);
  });

  useEffect(() => {
    const timer = window.setTimeout(() => refreshQueue(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const socketUrl = getNotificationsWebSocketUrl();
    if (!socketUrl) return;
    const socket = new WebSocket(socketUrl);
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { event?: string };
      if (payload.event?.startsWith("queue.") || payload.event?.startsWith("visit.")) {
        refreshQueue(false);
      }
    };
    return () => socket.close();
  }, []);

  const filteredQueue = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return queue
      .filter((visit) => {
        const matchesSearch =
          !normalized ||
          visit.student_name.toLowerCase().includes(normalized) ||
          visit.matric_number.toLowerCase().includes(normalized);
        const matchesFilter =
          filter === "all" ||
          filter === "waiting" ||
          (filter === "urgent" && visit.priority === "urgent") ||
          (filter === "emergency" && visit.priority === "emergency");
        return matchesSearch && matchesFilter;
      })
      .sort((first, second) => {
        const firstTime = new Date(first.registered_at || first.created_at).getTime();
        const secondTime = new Date(second.registered_at || second.created_at).getTime();
        return sort === "oldest" ? firstTime - secondTime : secondTime - firstTime;
      });
  }, [filter, query, queue, sort]);

  const urgentCount = queue.filter((visit) => visit.priority === "urgent").length;
  const emergencyCount = queue.filter((visit) => visit.priority === "emergency").length;

  return (
    <DashboardShell title="Nurse Queue" subtitle="FIFO triage dashboard" navItems={HOSPITAL_NAV.nurse} hideSidebar>
      <div className="space-y-6">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Nurse Queue Dashboard</p>
            <h2 className="text-2xl font-semibold text-slate-950">Patients Waiting for Triage</h2>
            <p className="text-sm text-slate-500">Queue management only. Open a visit to record vitals.</p>
          </div>
          <Button type="button" variant="outline" onClick={() => void loadQueue(false)} disabled={refreshing || loading}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Refresh
          </Button>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard icon={<UsersRound className="h-5 w-5 text-teal-700" />} label="Waiting Patients" value={queue.length.toString()} />
          <StatCard icon={<AlertTriangle className="h-5 w-5 text-amber-700" />} label="Urgent Cases" value={urgentCount.toString()} />
          <StatCard icon={<AlertTriangle className="h-5 w-5 text-red-700" />} label="Emergency Cases" value={emergencyCount.toString()} />
          <StatCard icon={<Clock3 className="h-5 w-5 text-slate-700" />} label="Average Wait Time" value={averageWait(queue)} />
        </section>

        <Card>
          <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" placeholder="Search by name or matric number" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={filter} onChange={(event) => setFilter(event.target.value as QueueFilter)}>
              <option value="all">All</option>
              <option value="waiting">Waiting</option>
              <option value="urgent">Urgent</option>
              <option value="emergency">Emergency</option>
            </select>
            <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={sort} onChange={(event) => setSort(event.target.value as QueueSort)}>
              <option value="oldest">Oldest First</option>
              <option value="newest">Newest First</option>
            </select>
          </CardContent>
        </Card>

        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {loading && <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading nurse queue...</p>}
        {!loading && filteredQueue.length === 0 && <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">No patients match the current filters.</p>}

        <section className="grid gap-4 xl:grid-cols-2">
          {filteredQueue.map((visit, index) => (
            <Card key={visit.id}>
              <CardHeader className="border-b border-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{visit.student_name}</CardTitle>
                    <CardDescription>{visit.matric_number}</CardDescription>
                  </div>
                  <Badge variant={priorityVariant(visit.priority)}>{visit.priority}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <Info label="Visit ID" value={visit.visit_number} />
                  <Info label="Arrival Time" value={formatDateTime(visit.registered_at || visit.created_at)} />
                  <Info label="Queue Position" value={`#${visit.nurse_queue_position || index + 1}`} />
                  <Info label="Waiting Time" value={formatWait(visit.registered_at || visit.created_at)} />
                </div>
                <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">{visit.chief_complaint || "General consultation intake"}</p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href={`/hospital/nurse/vitals/${visit.id}`}><HeartPulse className="h-4 w-4" /> Record Vitals</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/hospital/nurse/history/${visit.student_id}`}><History className="h-4 w-4" /> View History</Link>
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
