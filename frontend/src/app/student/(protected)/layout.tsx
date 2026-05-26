"use client";

import type { ReactNode } from "react";

import { ProtectedRoute } from "@/components/auth/protected-route";

export default function StudentProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute portal="student" allowedRoles={["student"]} loginPath="/login">
      {children}
    </ProtectedRoute>
  );
}
