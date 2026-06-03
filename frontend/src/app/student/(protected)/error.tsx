"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function StudentError({
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
      <h2 className="text-xl font-semibold text-slate-900">Student portal error</h2>
      <p className="max-w-lg text-sm text-slate-600">Something went wrong while loading your health data. Retry to restore the session view.</p>
      <Button onClick={reset}>Retry</Button>
    </div>
  );
}
