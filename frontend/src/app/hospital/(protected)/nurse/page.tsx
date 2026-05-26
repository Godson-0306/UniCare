"use client";

import { RoleDashboard } from "@/components/hospital/role-dashboard";

export default function NurseDashboardPage() {
  return (
    <RoleDashboard
      role="nurse"
      title="Nursing Station"
      description="Manage assigned queue, record vitals, and forward patients to doctors."
    />
  );
}
