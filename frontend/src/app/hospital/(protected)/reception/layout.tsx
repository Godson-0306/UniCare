"use client";

import type { ReactNode } from "react";

import { ProtectedRoute } from "@/components/auth/protected-route";

export default function ReceptionProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute portal="hospital" allowedRoles={["receptionist", "admin", "super_admin"]} loginPath="/login">
      {children}
    </ProtectedRoute>
  );
}
