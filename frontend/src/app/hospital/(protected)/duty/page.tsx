"use client";

import { RoleDashboard } from "@/components/hospital/role-dashboard";

export default function DutyOfficerDashboardPage() {
  return (
    <RoleDashboard
      role="duty_officer"
      title="Duty Officer"
      description="Monitor and resolve emergency events with priority override visibility."
    />
  );
}
