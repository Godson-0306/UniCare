"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";

export default function NotificationsFeed({ initial = [] }: { initial?: Record<string, any>[] }) {
  const [items, setItems] = useState<Record<string, any>[]>(initial);

  async function markRead(id: string) {
    const updated = items.map((it) => (it.id === id ? { ...it, is_read: true } : it));
    setItems(updated);
    try {
      await apiClient.patch(`/student/notifications/${id}/`, { is_read: true });
    } catch {
      // ignore — optimistic UI
    }
  }

  function markAllRead() {
    const updated = items.map((it) => ({ ...it, is_read: true }));
    setItems(updated);
    try {
      apiClient.post(`/student/notifications/mark_all_read/`);
    } catch {
      /* best-effort */
    }
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between p-4">
        <CardTitle>Notifications</CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={markAllRead}>Mark all read</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {items.length === 0 && <p className="text-sm text-slate-500">No notifications.</p>}
        {items.map((n) => (
          <div key={n.id} className={`rounded-lg border p-3 ${n.is_read ? "bg-white" : "bg-teal-50 border-teal-100"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{n.title ?? n.message ?? "Notification"}</p>
                <p className="mt-1 text-xs text-slate-600">{n.subtitle ?? n.summary}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">{new Date(n.created_at ?? n.timestamp ?? Date.now()).toLocaleString()}</p>
                {!n.is_read && (
                  <Button size="sm" variant="default" onClick={() => markRead(n.id)}>
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
