"use client";

import { Bell, Siren } from "lucide-react";
import { useEffect, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
          setQueue(Array.isArray(res.data.data) ? res.data.data : []);
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
        <Card>
          <CardHeader>
            <CardTitle>{ROLE_LABELS[role]} Workstation</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge>{workstation?.station_code ?? "personal"}</Badge>
            <Badge variant="secondary">Visit-centered workflow</Badge>
            <Badge variant="secondary">Audited actions</Badge>
          </CardContent>
        </Card>

        {endpoint && (
          <Card>
            <CardHeader>
              <CardTitle>Live Queue / Feed</CardTitle>
              <CardDescription>{queue.length} item(s)</CardDescription>
            </CardHeader>
            <CardContent>
              {error && <p className="text-sm text-amber-700">{error}</p>}
              {!error && queue.length === 0 && (
                <p className="text-sm text-slate-500">Queue is empty or awaiting patient flow.</p>
              )}
              <ul className="divide-y divide-slate-100">
                {queue.slice(0, 10).map((item, idx) => (
                  <li key={idx} className="py-3 text-sm">
                    <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-600">
                      {JSON.stringify(item, null, 2)}
                    </pre>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {liveAlerts.length > 0 && (
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-600" />
                Live Alerts
              </CardTitle>
              <CardDescription>Real-time queue movement and emergency escalations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {liveAlerts.map((alert, idx) => (
                <div key={`${alert.event}-${idx}`} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="mb-2 flex items-center gap-2 font-medium text-slate-900">
                    {alert.event.startsWith("emergency.") ? (
                      <Siren className="h-4 w-4 text-red-600" />
                    ) : (
                      <Bell className="h-4 w-4 text-teal-600" />
                    )}
                    <span>{alert.event}</span>
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-600">
                    {JSON.stringify(alert.data, null, 2)}
                  </pre>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-slate-400">Session active · {formatDateTime(new Date())}</p>
      </div>
    </DashboardShell>
  );
}
