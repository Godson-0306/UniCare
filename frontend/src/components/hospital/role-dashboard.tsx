"use client";

import { Bell, Siren } from "lucide-react";
import { useEffect, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api/client";
import { HOSPITAL_NAV } from "@/lib/hospital/nav-config";
import { ROLE_LABELS } from "@/lib/constants/roles";
import { getNotificationsWebSocketUrl } from "@/lib/realtime";
import { formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { UserRole } from "@/types/auth";

const QUEUE_ENDPOINTS: Partial<Record<UserRole, string>> = {
  receptionist: "/reception/students/search/?matric=demo",
  nurse: "/nurse/queue/",
  doctor: "/doctor/queue/",
  pharmacist: "/pharmacy/queue/",
  lab_technician: "/lab/queue/",
  duty_officer: "/emergency/events/",
};

interface RoleDashboardProps {
  role: UserRole;
  title: string;
  description: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function displayValue(value: unknown) {
  if (value == null || value === "") return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function FeedItemSummary({ item }: { item: Record<string, unknown> }) {
  const title =
    displayValue(item.student_name) ||
    displayValue(item.full_name) ||
    displayValue(item.visit_number) ||
    displayValue(item.event_type) ||
    displayValue(item.status) ||
    "Queue item";
  const subtitle =
    [
      displayValue(item.matric_number),
      displayValue(item.priority),
      displayValue(item.status),
      displayValue(item.queue_position) ? `Pos ${item.queue_position}` : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Live feed entry";

  const meta: Array<{ label: string; value: string }> = [
    { label: "Visit", value: displayValue(item.visit_number) ?? "" },
    { label: "Patient", value: displayValue(item.student_name || item.full_name) ?? "" },
    { label: "Matric", value: displayValue(item.matric_number) ?? "" },
    { label: "Priority", value: displayValue(item.priority) ?? "" },
    { label: "Status", value: displayValue(item.status) ?? "" },
    {
      label: "Created",
      value: (() => {
        const raw = displayValue(item.created_at || item.queued_at || item.registered_at);
        return raw && (raw.includes("T") || raw.includes("-")) ? formatDateTime(raw) : raw ?? "";
      })(),
    },
  ].filter((entry) => entry.value);

  return (
    <div className="space-y-2 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {displayValue(item.priority) ? <Badge variant="secondary">{String(item.priority)}</Badge> : null}
      </div>
      <p className="text-xs text-[var(--muted)]">{subtitle}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {meta.map((entry) => (
          <span key={entry.label}>
            <span className="font-semibold text-slate-500">{entry.label}: </span>
            {entry.value}
          </span>
        ))}
      </div>
    </div>
  );
}

function AlertSummary({ event, data }: { event: string; data: Record<string, unknown> }) {
  const label = event.replaceAll(".", " · ");
  const detail =
    displayValue(data.message) ||
    displayValue(data.student_name) ||
    displayValue(data.visit_number) ||
    displayValue(data.status) ||
    "Realtime update received";

  return (
    <div className="rounded-lg border border-[var(--border)] px-3 py-3 text-sm">
      <div className="mb-1 flex items-center gap-2 font-medium text-slate-900">
        {event.startsWith("emergency.") ? (
          <Siren className="h-4 w-4 text-red-600" />
        ) : (
          <Bell className="h-4 w-4 text-teal-600" />
        )}
        <span className="capitalize">{label}</span>
      </div>
      <p className="text-xs text-slate-600">{detail}</p>
    </div>
  );
}

export function RoleDashboard({ role, title, description }: RoleDashboardProps) {
  const { user, workstation } = useAuthStore();
  const [queue, setQueue] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState("");
  const [liveAlerts, setLiveAlerts] = useState<Array<{ event: string; data: Record<string, unknown> }>>([]);

  const endpoint = QUEUE_ENDPOINTS[role];

  useEffect(() => {
    if (!endpoint) return;

    apiClient
      .get(endpoint)
      .then((res) => {
        if (res.data.success) {
          setQueue(Array.isArray(res.data.data) ? res.data.data.map(asRecord) : []);
        }
      })
      .catch(() => setError("Connect to the API backend to load live queue data."));
  }, [endpoint]);

  useEffect(() => {
    const socketUrl = getNotificationsWebSocketUrl();
    if (!socketUrl) return;

    const socket = new WebSocket(socketUrl);
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { event?: string; data?: Record<string, unknown> };
      if (!payload.event || !payload.data) return;
      const eventName = payload.event;
      const data = payload.data;

      if (
        eventName.startsWith("queue.") ||
        eventName.startsWith("emergency.") ||
        eventName.startsWith("visit.") ||
        eventName.startsWith("lab.") ||
        eventName.startsWith("prescription.")
      ) {
        setLiveAlerts((current) => [{ event: eventName, data }, ...current].slice(0, 8));
      }

      if (eventName === "queue.updated") {
        setQueue((current) => [data, ...current].slice(0, 10));
      }

      if (eventName === "emergency.triggered") {
        try {
          const audioContext = new AudioContext();
          const oscillator = audioContext.createOscillator();
          const gain = audioContext.createGain();
          oscillator.connect(gain);
          gain.connect(audioContext.destination);
          oscillator.frequency.value = 880;
          gain.gain.value = 0.05;
          oscillator.start();
          setTimeout(() => oscillator.stop(), 350);
        } catch {
          /* browser may block autoplay audio */
        }
      }
    };

    return () => socket.close();
  }, []);

  const navItems = HOSPITAL_NAV[role] ?? [];

  return (
    <DashboardShell
      title={title}
      subtitle={`${ROLE_LABELS[role]} · ${workstation?.station_name ?? user?.username}`}
      navItems={navItems}
    >
      <div className="space-y-6">
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
          <h2 className="font-display text-xl font-semibold text-slate-900">{ROLE_LABELS[role]} workstation</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{workstation?.station_code ?? "personal"}</Badge>
            <Badge variant="secondary">Visit-centered workflow</Badge>
            <Badge variant="secondary">Audited actions</Badge>
          </div>
        </section>

        {endpoint ? (
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
            <div className="mb-2 flex items-end justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Live queue / feed</h3>
                <p className="text-sm text-[var(--muted)]">{queue.length} item(s)</p>
              </div>
            </div>
            {error ? (
              <p className="text-sm text-amber-700" role="alert">
                {error}
              </p>
            ) : null}
            {!error && queue.length === 0 ? (
              <p className="text-sm text-slate-500">Queue is empty or awaiting patient flow.</p>
            ) : null}
            <ul className="divide-y divide-[var(--border)]">
              {queue.slice(0, 10).map((item, idx) => (
                <li key={idx}>
                  <FeedItemSummary item={item} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {liveAlerts.length > 0 ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50/40 px-5 py-4">
            <h3 className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-900">
              <Bell className="h-4 w-4 text-amber-600" />
              Live alerts
            </h3>
            <p className="mb-3 text-sm text-[var(--muted)]">Real-time queue movement and emergency escalations</p>
            <div className="space-y-3">
              {liveAlerts.map((alert, idx) => (
                <AlertSummary key={`${alert.event}-${idx}`} event={alert.event} data={alert.data} />
              ))}
            </div>
          </section>
        ) : null}

        <p className="text-xs text-slate-400">Session active · {formatDateTime(new Date())}</p>
      </div>
    </DashboardShell>
  );
}
