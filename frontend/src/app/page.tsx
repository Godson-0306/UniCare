import Link from "next/link";
import { Activity, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-slate-50">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-10 px-4 py-20 text-center sm:px-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-600">UniCare</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            University Health Center
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
            Secure access to your health records, appointments, and clinical services.
          </p>
        </div>

        <Button asChild size="lg" className="min-w-[200px]">
          <Link href="/login">Sign in</Link>
        </Button>

        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
          <span className="inline-flex items-center gap-2">
            <Shield className="h-4 w-4 text-teal-600" />
            Encrypted sign-in
          </span>
          <span className="inline-flex items-center gap-2">
            <Activity className="h-4 w-4 text-teal-600" />
            Real-time care updates
          </span>
        </div>
      </div>
    </main>
  );
}
