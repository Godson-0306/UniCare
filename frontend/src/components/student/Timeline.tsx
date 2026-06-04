"use client";

import { Clock, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EventItem {
  id: string;
  type: string;
  title: string;
  date: string;
  subtitle?: string;
}

export default function Timeline({ events }: { events: EventItem[] }) {
  return (
    <Card>
      <CardHeader className="flex items-center gap-2 p-4">
        <Calendar className="h-5 w-5 text-teal-600" />
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <ol className="relative border-l border-slate-100">
          {events.map((ev) => (
            <li key={ev.id} className="mb-6 ml-4">
              <div className="absolute -left-2.5 mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-slate-200">
                <Clock className="h-3 w-3 text-slate-500" />
              </div>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">{ev.title}</h4>
                <time className="text-xs text-slate-500">{ev.date}</time>
              </div>
              {ev.subtitle && <p className="mt-1 text-sm text-slate-600">{ev.subtitle}</p>}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
