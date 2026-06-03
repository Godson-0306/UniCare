"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function HospitalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold text-slate-900">Hospital dashboard error</h2>
      <p className="max-w-lg text-sm text-slate-600">The workstation hit an unexpected UI error. You can retry safely without signing out.</p>
      <Button onClick={reset}>Retry</Button>
    </div>
  );
}
