import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden hero-atmosphere text-white">
      <div className="pointer-events-none absolute inset-0 hero-grid animate-unicare-fade" aria-hidden />
      <div
        className="pointer-events-none absolute -right-24 top-16 h-80 w-80 rounded-full bg-teal-300/20 blur-3xl animate-unicare-pulse-soft"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-16 bottom-10 h-72 w-72 rounded-full bg-emerald-200/15 blur-3xl animate-unicare-pulse-soft delay-200"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16 sm:px-10">
        <div className="max-w-2xl">
          <p className="font-display animate-unicare-rise text-5xl font-semibold tracking-tight text-white sm:text-7xl">
            UniCare
          </p>
          <p className="mt-5 max-w-xl animate-unicare-rise delay-100 text-lg text-teal-50/90 sm:text-xl">
            Secure access to campus health records, appointments, and clinical care.
          </p>
          <div className="mt-10 flex animate-unicare-rise delay-200 flex-wrap gap-3">
            <Button asChild size="lg" className="min-w-[160px] bg-white text-teal-900 hover:bg-teal-50">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="min-w-[160px] border-white/40 bg-transparent text-white hover:bg-white/10"
            >
              <Link href="/register">Create account</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
