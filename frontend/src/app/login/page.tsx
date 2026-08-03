"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-teal-50 via-white to-slate-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">UniCare</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">
            Use your user ID and password. You will be taken to your dashboard automatically.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="identifier" className="text-sm font-medium text-slate-700">
              User ID
            </label>
            <input
              id="identifier"
              className="flex h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-500"
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
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="flex h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-500"
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

          <button
            type="button"
            onClick={() => void onSignIn()}
            disabled={loading}
            className="h-10 w-full rounded-lg bg-teal-600 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </div>

        <div className="my-6 border-t border-slate-200" />

        <Link
          href="/register"
          className="flex h-10 w-full items-center justify-center rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Create account
        </Link>
      </div>
    </main>
  );
}
