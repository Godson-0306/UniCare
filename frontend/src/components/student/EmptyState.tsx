"use client";

import { AlertCircle } from "lucide-react";

export default function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center">
      <div className="rounded-full bg-slate-50 p-4 text-slate-600">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {description && <p className="max-w-md text-sm text-slate-600">{description}</p>}
    </div>
  );
}
