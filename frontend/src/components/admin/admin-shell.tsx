"use client";

import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { HOSPITAL_NAV } from "@/lib/hospital/nav-config";
import { useAuthStore } from "@/stores/auth-store";

export function AdminShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { user, workstation } = useAuthStore();
  const role = user?.role === "super_admin" ? "super_admin" : "admin";

  return (
    <DashboardShell
      title={title}
      subtitle={subtitle ?? `Admin workstation · ${workstation?.station_name ?? user?.username ?? "operator"}`}
      navItems={HOSPITAL_NAV[role]}
    >
      {children}
    </DashboardShell>
  );
}
