"use client";

import { Loader2, RefreshCcw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { QueueFiltersBar, QueueList, QueueListRow, QueueMetricsRow } from "@/components/hospital/queue-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  const loadQueue = useCallback(
    async (showLoading = true) => {
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
    },
    [endpoint, errorMessage, getItems]
  );

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
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-[var(--border)] pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">{eyebrow}</p>
          <h2 className="font-display text-2xl font-semibold text-slate-950">{heading}</h2>
          <p className="text-sm text-[var(--muted)]">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {extraHeaderActions}
          <Button type="button" variant="outline" onClick={() => void loadQueue(false)} disabled={refreshing || loading}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </header>

      <QueueMetricsRow
        items={[
          { label: title, value: items.length.toString() },
          { label: "Urgent", value: urgentCount.toString() },
          { label: "Emergency", value: emergencyCount.toString(), emphasize: emergencyCount > 0 },
          { label: "Average wait", value: averageWait(items) },
        ]}
      />

      <QueueFiltersBar>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search by name or matric number"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <select
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
          value={filter}
          onChange={(event) => setFilter(event.target.value as QueueFilter)}
        >
          <option value="all">All</option>
          <option value="waiting">Waiting</option>
          <option value="urgent">Urgent</option>
          <option value="emergency">Emergency</option>
        </select>
        <select
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
          value={sort}
          onChange={(event) => setSort(event.target.value as QueueSort)}
        >
          <option value="oldest">Oldest First</option>
          <option value="newest">Newest First</option>
        </select>
      </QueueFiltersBar>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? <p className="rounded-md border border-[var(--border)] bg-white p-4 text-sm text-slate-500">{loadingMessage}</p> : null}
      {!loading && filteredItems.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">{emptyMessage}</p>
      ) : null}

      {!loading && filteredItems.length > 0 ? (
        <QueueList>
          {filteredItems.map((item, index) => (
            <QueueListRow
              key={item.id}
              title={item.studentName}
              subtitle={`${item.matricNumber}${item.subtitle ? ` · ${item.subtitle}` : ""}`}
              badge={<Badge variant={priorityVariant(item.priority)}>{item.priority}</Badge>}
              meta={[
                { label: "Visit", value: item.visitNumber },
                { label: "Arrived", value: formatDateTime(item.queuedAt) },
                { label: "Position", value: `#${item.position || index + 1}` },
                { label: "Wait", value: formatWait(item.queuedAt) },
              ]}
              details={item.details}
              actions={item.actions}
              urgent={item.priority === "emergency" || item.priority === "urgent"}
            />
          ))}
        </QueueList>
      ) : null}
    </div>
  );
}
