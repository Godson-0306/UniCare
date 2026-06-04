"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface Action {
  label: string;
  href: string;
  icon: LucideIcon;
  variant?: "default" | "destructive" | "secondary";
}

export default function QuickActions({ actions }: { actions: Action[] }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between p-4">
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-3 p-4">
        {actions.map(({ label, href, icon: Icon, variant }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={
              "group flex flex-col items-center justify-center gap-2 rounded-lg border border-slate-100 bg-white p-3 text-center transition-shadow hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            }
          >
            <div
              className={`mx-auto mb-2 grid h-10 w-10 place-items-center rounded-lg ${
                variant === "destructive" ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-700"
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className={`text-sm font-medium ${variant === "destructive" ? "text-red-700" : "text-slate-700"}`}>{label}</div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
