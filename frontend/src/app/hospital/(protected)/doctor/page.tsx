"use client";

import { AlertTriangle, Clock3, History, Loader2, RefreshCcw, Search, Stethoscope, UsersRound } from "lucide-react";
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

interface DoctorQueueEntry {
  id: string;
  visit: string;
  visit_number: string;
  student_id: string;
  student_name: string;
  matric_number: string;
  visit_priority: "normal" | "urgent" | "emergency";
  position: number;
  created_at: string;
  vitals_completed_at: string;
}

type QueueFilter = "all" | "waiting" | "urgent" | "emergency" | "follow_up";
type QueueSort = "oldest" | "newest";

function priorityVariant(priority: DoctorQueueEntry["visit_priority"]) {
  if (priority === "emergency") return "destructive" as const;
  if (priority === "urgent") return "warning" as const;
  return "secondary" as const;
}

function minutesWaiting(value: string) {
  const startedAt = new Date(value).getTime();
  if (Number.isNaN(startedAt)) return 0;
  return Math.max(0, Math.floor((Date.now() - startedAt) / 60000));
}

function formatWaitingTime(value: string) {
  const minutes = minutesWaiting(value);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function averageWaitingTime(entries: DoctorQueueEntry[]) {
  if (entries.length === 0) return "0 min";
  const average = Math.round(entries.reduce((total, entry) => total + minutesWaiting(entry.vitals_completed_at), 0) / entries.length);
  if (average < 60) return `${average} min`;
  return `${Math.floor(average / 60)}h ${average % 60}m`;
}

export default function DoctorQueueDashboardPage() {
  const [queue, setQueue] = useState<DoctorQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [sort, setSort] = useState<QueueSort>("oldest");

  async function loadQueue(showLoading = true) {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const { data } = await apiClient.get("/doctor/queue/");
      if (data.success) setQueue(data.data as DoctorQueueEntry[]);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load doctor queue."));
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
      if (payload.event?.startsWith("queue.") || payload.event?.startsWith("visit.") || payload.event?.startsWith("consultation.")) {
        refreshQueue(false);
      }
    };
    return () => socket.close();
  }, []);

  const filteredQueue = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return queue
      .filter((entry) => {
        const matchesSearch =
          !normalizedSearch ||
          entry.student_name.toLowerCase().includes(normalizedSearch) ||
          entry.matric_number.toLowerCase().includes(normalizedSearch);
        const matchesFilter =
          filter === "all" ||
          filter === "waiting" ||
          (filter === "urgent" && entry.visit_priority === "urgent") ||
          (filter === "emergency" && entry.visit_priority === "emergency") ||
          filter === "follow_up";
        return matchesSearch && matchesFilter;
      })
      .sort((first, second) => {
        const firstTime = new Date(first.vitals_completed_at).getTime();
        const secondTime = new Date(second.vitals_completed_at).getTime();
        return sort === "oldest" ? firstTime - secondTime : secondTime - firstTime;
      });
  }, [filter, queue, searchTerm, sort]);

  const urgentCount = queue.filter((entry) => entry.visit_priority === "urgent").length;
  const emergencyCount = queue.filter((entry) => entry.visit_priority === "emergency").length;

  return (
    <DashboardShell
      title="Doctor Queue"
      subtitle="FIFO consultation dashboard"
      navItems={HOSPITAL_NAV.doctor}
      hideSidebar
    >
      <div className="space-y-6">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Doctor Queue Dashboard</p>
            <h2 className="text-2xl font-semibold text-slate-950">Patients Ready for Consultation</h2>
            <p className="text-sm text-slate-500">Oldest completed vitals appear first for FIFO clinical flow.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" asChild>
              <Link href="/hospital/doctor/followups">Follow-ups</Link>
            </Button>
            <Button type="button" variant="outline" onClick={() => void loadQueue(false)} disabled={refreshing || loading}>
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard icon={<UsersRound className="h-5 w-5 text-teal-700" />} label="Waiting Patients" value={queue.length.toString()} />
          <StatCard icon={<AlertTriangle className="h-5 w-5 text-amber-700" />} label="Urgent Cases" value={urgentCount.toString()} />
          <StatCard icon={<AlertTriangle className="h-5 w-5 text-red-700" />} label="Emergency Cases" value={emergencyCount.toString()} />
          <StatCard icon={<Clock3 className="h-5 w-5 text-slate-700" />} label="Average Waiting Time" value={averageWaitingTime(queue)} />
        </section>

        <Card>
          <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search by matric number or patient name"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={filter} onChange={(event) => setFilter(event.target.value as QueueFilter)}>
              <option value="all">All</option>
              <option value="waiting">Waiting</option>
              <option value="urgent">Urgent</option>
              <option value="emergency">Emergency</option>
              <option value="follow_up">Follow-up</option>
            </select>
            <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={sort} onChange={(event) => setSort(event.target.value as QueueSort)}>
              <option value="oldest">Oldest First</option>
              <option value="newest">Newest First</option>
            </select>
          </CardContent>
        </Card>

        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {loading && <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading doctor queue...</p>}
        {!loading && filteredQueue.length === 0 && (
          <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            No patients match the current queue filters.
          </p>
        )}

        <section className="grid gap-4 xl:grid-cols-2">
          {filteredQueue.map((entry, index) => (
            <Card key={entry.id} className="overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{entry.student_name}</CardTitle>
                    <CardDescription>{entry.matric_number}</CardDescription>
                  </div>
                  <Badge variant={priorityVariant(entry.visit_priority)}>{entry.visit_priority}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <Info label="Visit ID" value={entry.visit_number} />
                  <Info label="Queue Position" value={`#${entry.position || index + 1}`} />
                  <Info label="Waiting Time" value={formatWaitingTime(entry.vitals_completed_at)} />
                  <Info label="Vitals Completed" value={formatDateTime(entry.vitals_completed_at)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href={`/hospital/doctor/consultation/${entry.visit}`}>
                      <Stethoscope className="h-4 w-4" />
                      Start Consultation
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/hospital/doctor/history/${entry.student_id}`}>
                      <History className="h-4 w-4" />
                      View History
                    </Link>
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
