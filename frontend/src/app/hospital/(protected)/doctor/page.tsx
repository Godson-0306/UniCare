"use client";

import { RoleDashboard } from "@/components/hospital/role-dashboard";

export default function DoctorDashboardPage() {
  return (
    <RoleDashboard
      role="doctor"
      title="Doctor Station"
      description="Consultations, prescriptions, lab requests, treatment schedules, and follow-ups."
    />
  );
}
