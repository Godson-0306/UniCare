"use client";

import { AlertTriangle, Clock3, Loader2, RefreshCcw, Search, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNotificationsSocket } from "@/hooks/use-notifications-socket";
import { apiClient } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/utils";

export interface QueueDashboardItem {
  id: string;
  studentName: string;
  matricNumber: string;
  priority: "normal" | "urgent" | "emergency";
  queuedAt: string;
  position: number;
  visitNumber: string;
  subtitle?: string;
  details?: ReactNode;
  actions: ReactNode;
}

interface QueueDashboardProps<T> {
  title: string;
  eyebrow: string;
  heading: string;
  description: string;
  endpoint: string;
  errorMessage: string;
  loadingMessage: string;
  emptyMessage: string;
  refreshEvents?: string[];
  getItems: (data: unknown) => T[];
  mapItem: (item: T, index: number) => QueueDashboardItem;
  extraHeaderActions?: ReactNode;
}

type QueueFilter = "all" | "waiting" | "urgent" | "emergency";
type QueueSort = "oldest" | "newest";

function priorityVariant(priority: QueueDashboardItem["priority"]) {
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

function averageWait(items: QueueDashboardItem[]) {
  if (items.length === 0) return "0 min";
  const average = Math.round(items.reduce((total, item) => total + minutesWaiting(item.queuedAt), 0) / items.length);
  if (average < 60) return `${average} min`;
  return `${Math.floor(average / 60)}h ${average % 60}m`;
}

export function QueueDashboard<T>({
  title,
  eyebrow,
  heading,
  description,
  endpoint,
  errorMessage,
  loadingMessage,
  emptyMessage,
  refreshEvents = ["queue.", "visit."],
  getItems,
  mapItem,
  extraHeaderActions,
}: QueueDashboardProps<T>) {
  const [rawItems, setRawItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [sort, setSort] = useState<QueueSort>("oldest");

  const loadQueue = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const { data } = await apiClient.get(endpoint);
      if (data.success) setRawItems(getItems(data.data));
    } catch (err) {
      setError(getApiErrorMessage(err, errorMessage));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [endpoint, errorMessage, getItems]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadQueue(true), 0);
    return () => window.clearTimeout(timer);
  }, [loadQueue]);

  useNotificationsSocket({
    onMessage: (event) => {
      const payload = JSON.parse(event.data) as { event?: string };
      if (payload.event && refreshEvents.some((prefix) => payload.event?.startsWith(prefix))) {
        void loadQueue(false);
      }
    },
  });

  const items = useMemo(() => rawItems.map(mapItem), [mapItem, rawItems]);
  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items
      .filter((item) => {
        const matchesSearch =
          !normalized ||
          item.studentName.toLowerCase().includes(normalized) ||
          item.matricNumber.toLowerCase().includes(normalized);
        const matchesFilter =
          filter === "all" ||
          filter === "waiting" ||
          (filter === "urgent" && item.priority === "urgent") ||
          (filter === "emergency" && item.priority === "emergency");
        return matchesSearch && matchesFilter;
      })
      .sort((first, second) => {
        const firstTime = new Date(first.queuedAt).getTime();
        const secondTime = new Date(second.queuedAt).getTime();
        return sort === "oldest" ? firstTime - secondTime : secondTime - firstTime;
      });
  }, [filter, items, query, sort]);

  const urgentCount = items.filter((item) => item.priority === "urgent").length;
  const emergencyCount = items.filter((item) => item.priority === "emergency").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">{eyebrow}</p>
          <h2 className="text-2xl font-semibold text-slate-950">{heading}</h2>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {extraHeaderActions}
          <Button type="button" variant="outline" onClick={() => void loadQueue(false)} disabled={refreshing || loading}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard icon={<UsersRound className="h-5 w-5 text-teal-700" />} label={title} value={items.length.toString()} />
        <StatCard icon={<AlertTriangle className="h-5 w-5 text-amber-700" />} label="Urgent Cases" value={urgentCount.toString()} />
        <StatCard icon={<AlertTriangle className="h-5 w-5 text-red-700" />} label="Emergency Cases" value={emergencyCount.toString()} />
        <StatCard icon={<Clock3 className="h-5 w-5 text-slate-700" />} label="Average Wait" value={averageWait(items)} />
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
      {loading && <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500">{loadingMessage}</p>}
      {!loading && filteredItems.length === 0 && <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">{emptyMessage}</p>}

      <section className="grid gap-4 xl:grid-cols-2">
        {filteredItems.map((item, index) => (
          <Card key={item.id}>
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{item.studentName}</CardTitle>
                  <CardDescription>{item.matricNumber}</CardDescription>
                </div>
                <Badge variant={priorityVariant(item.priority)}>{item.priority}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <Info label="Visit ID" value={item.visitNumber} />
                <Info label="Arrival Time" value={formatDateTime(item.queuedAt)} />
                <Info label="Queue Position" value={`#${item.position || index + 1}`} />
                <Info label="Waiting Time" value={formatWait(item.queuedAt)} />
              </div>
              {item.subtitle && <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">{item.subtitle}</p>}
              {item.details}
              <div className="flex flex-wrap gap-2">{item.actions}</div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
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
