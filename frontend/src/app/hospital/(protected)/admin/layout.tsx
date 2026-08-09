"use client";

import type { ReactNode } from "react";

import { ProtectedRoute } from "@/components/auth/protected-route";

export default function AdminProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute portal="hospital" allowedRoles={["admin", "super_admin"]} loginPath="/login">
      {children}
    </ProtectedRoute>
  );
}
