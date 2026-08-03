"use client";

import { Clock3, FileCheck2, History, Loader2, Pill, RefreshCcw, Search, UsersRound } from "lucide-react";
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

type PrescriptionStatus = "pending" | "partially_dispensed" | "dispensed" | "cancelled";
type StatusFilter = "all" | "pending" | "ready" | "dispensed";
type QueueSort = "oldest" | "newest";

interface PrescriptionItem {
  id: string;
  drug_name: string;
  is_dispensed: boolean;
}

interface Prescription {
  id: string;
  prescription_number: string;
  status: PrescriptionStatus;
  student_id: string;
  student_name: string;
  matric_number: string;
  visit_number: string;
  prescribed_by: string;
  created_at: string;
  dispensed_at: string | null;
  items: PrescriptionItem[];
}

function statusVariant(status: PrescriptionStatus) {
  if (status === "dispensed") return "default" as const;
  if (status === "partially_dispensed") return "warning" as const;
  if (status === "cancelled") return "destructive" as const;
  return "secondary" as const;
}

function minutesBetween(start: string, end = new Date().toISOString()) {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (Number.isNaN(startTime) || Number.isNaN(endTime)) return 0;
  return Math.max(0, Math.floor((endTime - startTime) / 60000));
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function averageDispensingTime(prescriptions: Prescription[]) {
  const completed = prescriptions.filter((item) => item.dispensed_at);
  if (completed.length === 0) return "0 min";
  const average = Math.round(completed.reduce((total, item) => total + minutesBetween(item.created_at, item.dispensed_at ?? item.created_at), 0) / completed.length);
  return formatDuration(average);
}

function dispensedToday(prescriptions: Prescription[]) {
  const today = new Date().toDateString();
  return prescriptions.filter((item) => item.dispensed_at && new Date(item.dispensed_at).toDateString() === today).length;
}

export default function PharmacyQueueDashboardPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<QueueSort>("oldest");
  const [error, setError] = useState("");

  const loadQueue = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const { data } = await apiClient.get("/pharmacy/queue/");
      if (data.success) setPrescriptions(data.data as Prescription[]);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load pharmacy queue."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadQueue(true), 0);
    return () => window.clearTimeout(timer);
  }, [loadQueue]);

  useRealtimeRefresh(loadQueue, ["prescription.", "consultation.saved"]);

  const filteredPrescriptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return prescriptions
      .filter((prescription) => {
        const matchesSearch =
          !normalized ||
          prescription.prescription_number.toLowerCase().includes(normalized) ||
          prescription.student_name.toLowerCase().includes(normalized) ||
          prescription.matric_number.toLowerCase().includes(normalized);
        const matchesFilter =
          filter === "all" ||
          (filter === "ready" && prescription.status === "partially_dispensed") ||
          (filter !== "ready" && prescription.status === filter);
        return matchesSearch && matchesFilter;
      })
      .sort((first, second) => {
        const firstTime = new Date(first.created_at).getTime();
        const secondTime = new Date(second.created_at).getTime();
        return sort === "oldest" ? firstTime - secondTime : secondTime - firstTime;
      });
  }, [filter, prescriptions, query, sort]);

  const pendingCount = prescriptions.filter((item) => item.status === "pending" || item.status === "partially_dispensed").length;

  return (
    <DashboardShell title="Pharmacy Queue" subtitle="Medication dispensing dashboard" navItems={HOSPITAL_NAV.pharmacist} hideSidebar>
      <div className="space-y-6">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Pharmacy Dashboard</p>
            <h2 className="text-2xl font-semibold text-slate-950">Prescriptions Awaiting Dispensing</h2>
            <p className="text-sm text-slate-500">Queue management only. Open a prescription to dispense medication.</p>
          </div>
          <Button type="button" variant="outline" onClick={() => void loadQueue(false)} disabled={refreshing || loading}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Refresh
          </Button>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard icon={<Pill className="h-5 w-5 text-teal-700" />} label="Pending Prescriptions" value={pendingCount.toString()} />
          <StatCard icon={<FileCheck2 className="h-5 w-5 text-teal-700" />} label="Dispensed Today" value={dispensedToday(prescriptions).toString()} />
          <StatCard icon={<UsersRound className="h-5 w-5 text-slate-700" />} label="Waiting Patients" value={pendingCount.toString()} />
          <StatCard icon={<Clock3 className="h-5 w-5 text-slate-700" />} label="Average Dispensing Time" value={averageDispensingTime(prescriptions)} />
        </section>

        <Card>
          <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" placeholder="Search by prescription, name, or matric number" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={filter} onChange={(event) => setFilter(event.target.value as StatusFilter)}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="ready">Ready / Partial</option>
              <option value="dispensed">Dispensed</option>
            </select>
            <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={sort} onChange={(event) => setSort(event.target.value as QueueSort)}>
              <option value="oldest">Oldest First</option>
              <option value="newest">Newest First</option>
            </select>
          </CardContent>
        </Card>

        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {loading && <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading pharmacy queue...</p>}
        {!loading && filteredPrescriptions.length === 0 && <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">No prescriptions match the current filters.</p>}

        <section className="grid gap-4 xl:grid-cols-2">
          {filteredPrescriptions.map((prescription) => (
            <Card key={prescription.id}>
              <CardHeader className="border-b border-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{prescription.prescription_number}</CardTitle>
                    <CardDescription>{prescription.student_name} · {prescription.matric_number}</CardDescription>
                  </div>
                  <Badge variant={statusVariant(prescription.status)}>{prescription.status.replaceAll("_", " ")}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <Info label="Visit ID" value={prescription.visit_number || "N/A"} />
                  <Info label="Prescribing Doctor" value={prescription.prescribed_by || "Clinical team"} />
                  <Info label="Date Prescribed" value={formatDateTime(prescription.created_at)} />
                  <Info label="Medication Count" value={`${prescription.items.length} medication(s)`} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild><Link href={`/hospital/pharmacy/prescription/${prescription.id}`}>Open Prescription</Link></Button>
                  <Button asChild variant="outline"><Link href={`/hospital/pharmacy/history/${prescription.student_id}`}><History className="h-4 w-4" /> View History</Link></Button>
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
