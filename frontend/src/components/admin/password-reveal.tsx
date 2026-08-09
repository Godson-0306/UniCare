"use client";

import { Button } from "@/components/ui/button";

export function PasswordReveal({
  password,
  onDismiss,
}: {
  password: string;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
      <p className="font-medium">Temporary password (copy now — it will not be shown again)</p>
      <p className="mt-2 font-mono text-base tracking-wide">{password}</p>
      <div className="mt-3">
        <Button type="button" size="sm" variant="outline" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
