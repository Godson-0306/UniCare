"use client";

import { BellRing, Siren, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { getNotificationsWebSocketUrl } from "@/lib/realtime";

interface LiveEventPayload {
  event: string;
  data: Record<string, unknown>;
}

function playEmergencyTone() {
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.05;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    window.setTimeout(() => {
      oscillator.stop();
      void context.close();
    }, 450);
  } catch {
    // Browsers may block autoplay audio until user interaction.
  }
}

export function HospitalRealtimeAlertCenter() {
  const [alerts, setAlerts] = useState<LiveEventPayload[]>([]);

  useEffect(() => {
    const socketUrl = getNotificationsWebSocketUrl();
    if (!socketUrl) return;

    const socket = new WebSocket(socketUrl);
    socket.onmessage = (message) => {
      const payload = JSON.parse(message.data) as Partial<LiveEventPayload>;
      if (!payload.event || !payload.data) return;
      if (!payload.event.startsWith("emergency.")) return;

      setAlerts((current) => [{ event: payload.event!, data: payload.data! }, ...current].slice(0, 4));
      if (payload.event === "emergency.triggered") {
        playEmergencyTone();
      }
    };

    return () => socket.close();
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed right-4 top-20 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
      {alerts.map((alert, index) => (
        <div
          key={`${alert.event}-${String(alert.data.id ?? index)}`}
          className="rounded-2xl border border-red-200 bg-white p-4 shadow-xl shadow-red-100"
        >
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              {alert.event === "emergency.triggered" ? (
                <Siren className="h-5 w-5 text-red-600" />
              ) : (
                <BellRing className="h-5 w-5 text-amber-600" />
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {alert.event === "emergency.triggered" ? "Emergency Alert" : "Emergency Update"}
                </p>
                <p className="text-xs text-slate-500">{String(alert.data.student ?? "Hospital response event")}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setAlerts((current) => current.filter((_, alertIndex) => alertIndex !== index))}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1 text-sm text-slate-700">
            <p>{String(alert.data.description ?? "Emergency response requested.")}</p>
            {alert.data.assigned_workstation && (
              <p className="text-xs font-medium text-red-700">
                Assigned workstation: {String(alert.data.assigned_workstation)}
              </p>
            )}
            {alert.data.location_label && <p className="text-xs text-slate-500">Location: {String(alert.data.location_label)}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
