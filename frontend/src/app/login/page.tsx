"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, toAuthSession } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api/errors";
import { loginSchema } from "@/lib/auth/schemas";
import { portalForAccount } from "@/lib/auth/portal";
import { ROLE_DASHBOARD_PATH } from "@/lib/constants/roles";
import { useAuthStore } from "@/stores/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSignIn() {
    const parsed = loginSchema.safeParse({ identifier, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter your user ID and password.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await login(parsed.data.identifier, parsed.data.password);

      if (!response.success) {
        setError(response.error?.message ?? "Sign in failed.");
        return;
      }

      const session = toAuthSession(response.data);
      const portal = portalForAccount(session.user.account_type);
      const destination = ROLE_DASHBOARD_PATH[session.user.role];

      if (!destination) {
        setError("No dashboard configured for your role.");
        return;
      }

      setSession(session, portal);
      router.replace(destination);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to sign in.", { authOperation: true }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden app-atmosphere p-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-teal-100/70 to-transparent" aria-hidden />
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 p-8 shadow-sm backdrop-blur">
        <div className="mb-8 text-center">
          <p className="font-display text-4xl font-semibold tracking-tight text-[var(--brand-ink)]">UniCare</p>
          <h1 className="mt-3 text-lg font-medium text-slate-700">Sign in to continue</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Use your user ID and password. You will be taken to your dashboard automatically.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">User ID</Label>
            <Input
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void onSignIn();
                }
              }}
              placeholder="Your user ID"
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void onSignIn();
                }
              }}
              placeholder="Password"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="button" className="w-full" onClick={() => void onSignIn()} disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </div>

        <div className="my-6 border-t border-[var(--border)]" />

        <Button asChild variant="outline" className="w-full">
          <Link href="/register">Create account</Link>
        </Button>
      </div>
    </main>
  );
}
