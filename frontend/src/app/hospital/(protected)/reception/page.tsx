"use client";

import { RoleDashboard } from "@/components/hospital/role-dashboard";

export default function ReceptionDashboardPage() {
  return (
    <RoleDashboard
      role="receptionist"
      title="Reception"
      description="Search students by matric number, register visits, and assign nurse queue."
    />
  );
}
