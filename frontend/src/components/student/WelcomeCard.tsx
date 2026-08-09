"use client";

import { User } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface Props {
  fullName?: string | null;
  matric?: string | null;
  lastVisit?: string | null;
  summary?: string | null;
  department?: string | null;
  faculty?: string | null;
  level?: string | null;
}

export default function WelcomeCard({ fullName, matric, lastVisit, summary, department, faculty, level }: Props) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-6 sm:px-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-xl bg-teal-50 text-teal-700">
            <User className="h-7 w-7" />
          </div>
          <div>
            <p className="font-display text-2xl font-semibold tracking-tight text-slate-900">{fullName ?? "Student"}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{matric ?? "—"}</p>
            <p className="mt-2 text-xs text-slate-600">
              {[department, faculty, level ? `Level ${level}` : null].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-3 max-w-xl text-sm text-slate-700">{summary ?? "No health summary available."}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
          <div className="text-left lg:text-right">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Last visit</p>
            <p className="text-sm font-semibold text-slate-900">{lastVisit ?? "No recent visits"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/student/medical-history">Medical history</Link>
            </Button>
            <Button variant="secondary" asChild size="sm">
              <Link href="/student/contact">Contact centre</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
