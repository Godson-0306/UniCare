"use client";

import { RoleDashboard } from "@/components/hospital/role-dashboard";

export default function LabDashboardPage() {
  return (
    <RoleDashboard
      role="lab_technician"
      title="Laboratory"
      description="Process lab requests, upload results, and attach files to medical history."
    />
  );
}
