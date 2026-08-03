"use client";

import { useCallback } from "react";

import { useNotificationsSocket } from "@/hooks/use-notifications-socket";

export function useRealtimeRefresh(refresh: (showLoading?: boolean) => void | Promise<void>, events: string[]) {
  const onMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as { event?: string };
        const eventName = payload.event;
        if (!eventName) return;
        const shouldRefresh = events.some((prefix) => eventName === prefix || eventName.startsWith(prefix));
        if (shouldRefresh) {
          void refresh(false);
        }
      } catch {
        // Ignore malformed websocket payloads.
      }
    },
    [events, refresh],
  );

  useNotificationsSocket({ onMessage });
}
