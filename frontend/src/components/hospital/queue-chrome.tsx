import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function QueueMetricsRow({
  items,
}: {
  items: Array<{ label: string; value: string; emphasize?: boolean }>;
}) {
  return (
    <dl className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{item.label}</dt>
          <dd
            className={cn(
              "mt-1 font-display text-2xl font-semibold tabular-nums text-slate-950",
              item.emphasize && "text-red-700"
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function QueueFiltersBar({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 lg:grid-cols-[1fr_180px_180px]">
      {children}
    </div>
  );
}

export function QueueList({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">{children}</ul>;
}

export function QueueListRow({
  title,
  subtitle,
  meta,
  badge,
  details,
  actions,
  urgent,
}: {
  title: string;
  subtitle: string;
  meta: Array<{ label: string; value: string }>;
  badge?: ReactNode;
  details?: ReactNode;
  actions: ReactNode;
  urgent?: boolean;
}) {
  return (
    <li className={cn("px-4 py-4 transition-colors hover:bg-slate-50/80", urgent && "bg-red-50/40")}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {badge}
          </div>
          <p className="text-sm text-[var(--muted)]">{subtitle}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            {meta.map((item) => (
              <span key={item.label}>
                <span className="font-semibold text-slate-500">{item.label}: </span>
                {item.value}
              </span>
            ))}
          </div>
          {details}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      </div>
    </li>
  );
}
