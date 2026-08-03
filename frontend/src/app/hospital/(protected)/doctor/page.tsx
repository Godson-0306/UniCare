"use client";

import { History, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";

import { QueueDashboard } from "@/components/hospital/queue-dashboard";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { HOSPITAL_NAV } from "@/lib/hospital/nav-config";

interface DoctorQueueEntry {
  id: string;
  visit: string;
  visit_number: string;
  student_id: string;
  student_name: string;
  matric_number: string;
  visit_priority: "normal" | "urgent" | "emergency";
  position: number;
  vitals_completed_at: string;
}

export default function DoctorQueueDashboardPage() {
  const getItems = useCallback((data: unknown) => data as DoctorQueueEntry[], []);
  const mapItem = useCallback((entry: DoctorQueueEntry, index: number) => ({
    id: entry.id,
    studentName: entry.student_name,
    matricNumber: entry.matric_number,
    priority: entry.visit_priority,
    queuedAt: entry.vitals_completed_at,
    position: entry.position || index + 1,
    visitNumber: entry.visit_number,
    actions: (
      <>
        <Button asChild>
          <Link href={`/hospital/doctor/consultation/${entry.visit}`}>
            <Stethoscope className="h-4 w-4" />
            Start Consultation
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/hospital/doctor/history/${entry.student_id}`}>
            <History className="h-4 w-4" />
            View History
          </Link>
        </Button>
      </>
    ),
  }), []);

  return (
    <DashboardShell title="Doctor Queue" subtitle="FIFO consultation dashboard" navItems={HOSPITAL_NAV.doctor} hideSidebar>
      <QueueDashboard<DoctorQueueEntry>
        title="Waiting Patients"
        eyebrow="Doctor Queue Dashboard"
        heading="Patients Ready for Consultation"
        description="Oldest completed vitals appear first for FIFO clinical flow."
        endpoint="/doctor/queue/"
        errorMessage="Unable to load doctor queue."
        loadingMessage="Loading doctor queue..."
        emptyMessage="No patients match the current queue filters."
        refreshEvents={["queue.", "visit.", "consultation."]}
        getItems={getItems}
        mapItem={mapItem}
        extraHeaderActions={
          <Button type="button" variant="outline" asChild>
            <Link href="/hospital/doctor/followups">Follow-ups</Link>
          </Button>
        }
      />
    </DashboardShell>
  );
}
