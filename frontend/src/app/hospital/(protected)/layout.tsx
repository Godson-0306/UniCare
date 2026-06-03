"use client";

import type { ReactNode } from "react";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { HospitalRealtimeAlertCenter } from "@/components/hospital/hospital-realtime-alert-center";
import { HOSPITAL_ROLES } from "@/lib/constants/roles";

export default function HospitalProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute portal="hospital" allowedRoles={HOSPITAL_ROLES} loginPath="/login">
      <HospitalRealtimeAlertCenter />
      {children}
    </ProtectedRoute>
  );
}
