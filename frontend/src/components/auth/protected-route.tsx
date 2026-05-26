"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import type { PortalType, UserRole } from "@/types/auth";
import { ROLE_DASHBOARD_PATH } from "@/lib/constants/roles";
import { useAuthStore } from "@/stores/auth-store";

interface ProtectedRouteProps {
  children: ReactNode;
  portal: PortalType;
  allowedRoles?: UserRole[];
  loginPath: string;
}

export function ProtectedRoute({ children, portal, allowedRoles, loginPath }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, tokens, portal: activePortal, isHydrated } = useAuthStore();

  useEffect(() => {
    if (!isHydrated) return;

    if (!tokens?.access || !user) {
      router.replace(loginPath);
      return;
    }

    if (activePortal !== portal) {
      router.replace(ROLE_DASHBOARD_PATH[user.role] ?? loginPath);
      return;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.replace(ROLE_DASHBOARD_PATH[user.role] ?? loginPath);
    }
  }, [isHydrated, tokens, user, activePortal, portal, allowedRoles, loginPath, router]);

  if (!isHydrated || !tokens?.access || !user || activePortal !== portal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
