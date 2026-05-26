"use client";

import { RoleDashboard } from "@/components/hospital/role-dashboard";

export default function PharmacyDashboardPage() {
  return (
    <RoleDashboard
      role="pharmacist"
      title="Pharmacy"
      description="Receive prescriptions, verify items, and mark medications dispensed."
    />
  );
}
