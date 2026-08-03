"use client";

import { useEffect, useState } from "react";

import { getNotificationsWebSocketUrl } from "@/lib/realtime";

type SocketStatus = "idle" | "connecting" | "open" | "closed" | "error";

interface UseNotificationsSocketOptions {
  enabled?: boolean;
  onMessage?: (event: MessageEvent) => void;
}

export function useNotificationsSocket({ enabled = true, onMessage }: UseNotificationsSocketOptions = {}) {
  const [status, setStatus] = useState<SocketStatus>("idle");

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const socketUrl = getNotificationsWebSocketUrl();
    if (!socketUrl) return;

    let socket: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let manuallyClosed = false;
    let attempts = 0;

    function connect() {
      setStatus("connecting");
      socket = new WebSocket(socketUrl);
      socket.onopen = () => {
        attempts = 0;
        setStatus("open");
      };
      socket.onerror = () => setStatus("error");
      socket.onmessage = (event) => onMessage?.(event);
      socket.onclose = () => {
        if (manuallyClosed) {
          setStatus("closed");
          return;
        }
        setStatus("closed");
        attempts += 1;
        const delay = Math.min(1000 * attempts, 5000);
        reconnectTimer = window.setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      manuallyClosed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [enabled, onMessage]);

  return { status };
}
