"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";

export default function NotificationsFeed({ initial = [] }: { initial?: Record<string, unknown>[] }) {
  const [items, setItems] = useState<Record<string, unknown>[]>(initial);

  async function markRead(id: string) {
    const updated = items.map((item) => (item.id === id ? { ...item, is_read: true } : item));
    setItems(updated);
    try {
      await apiClient.patch(`/student/notifications/${id}/`, { is_read: true });
    } catch {
      // Optimistic UI only.
    }
  }

  function markAllRead() {
    const updated = items.map((item) => ({ ...item, is_read: true }));
    setItems(updated);
    void apiClient.post("/student/notifications/mark_all_read/").catch(() => undefined);
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between p-4">
        <CardTitle>Notifications</CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={markAllRead}>
            Mark all read
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {items.length === 0 && <p className="text-sm text-slate-500">No notifications.</p>}
        {items.map((notification) => (
          <div key={String(notification.id)} className={`rounded-lg border p-3 ${notification.is_read ? "bg-white" : "border-teal-100 bg-teal-50"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{String(notification.title ?? notification.message ?? "Notification")}</p>
                <p className="mt-1 text-xs text-slate-600">{String(notification.subtitle ?? notification.summary ?? "")}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">
                  {typeof notification.created_at === "string" || typeof notification.timestamp === "string"
                    ? new Date(String(notification.created_at ?? notification.timestamp)).toLocaleString()
                    : ""}
                </p>
                {!notification.is_read && (
                  <Button size="sm" variant="default" onClick={() => markRead(String(notification.id))}>
                    Mark read
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
