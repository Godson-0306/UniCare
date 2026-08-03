"use client";

import { HeartPulse, History } from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";

import { QueueDashboard } from "@/components/hospital/queue-dashboard";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { HOSPITAL_NAV } from "@/lib/hospital/nav-config";

interface NurseQueueVisit {
  id: string;
  visit_number: string;
  student_id: string;
  student_name: string;
  matric_number: string;
  priority: "normal" | "urgent" | "emergency";
  chief_complaint: string;
  registered_at: string;
  created_at: string;
  nurse_queue_position: number;
}

export default function NurseQueueDashboardPage() {
  const getItems = useCallback((data: unknown) => data as NurseQueueVisit[], []);
  const mapItem = useCallback((visit: NurseQueueVisit, index: number) => ({
    id: visit.id,
    studentName: visit.student_name,
    matricNumber: visit.matric_number,
    priority: visit.priority,
    queuedAt: visit.registered_at || visit.created_at,
    position: visit.nurse_queue_position || index + 1,
    visitNumber: visit.visit_number,
    subtitle: visit.chief_complaint || "General consultation intake",
    actions: (
      <>
        <Button asChild>
          <Link href={`/hospital/nurse/vitals/${visit.id}`}>
            <HeartPulse className="h-4 w-4" />
            Record Vitals
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/hospital/nurse/history/${visit.student_id}`}>
            <History className="h-4 w-4" />
            View History
          </Link>
        </Button>
      </>
    ),
  }), []);

  return (
    <DashboardShell title="Nurse Queue" subtitle="FIFO triage dashboard" navItems={HOSPITAL_NAV.nurse} hideSidebar>
      <QueueDashboard<NurseQueueVisit>
        title="Waiting Patients"
        eyebrow="Nurse Queue Dashboard"
        heading="Patients Waiting for Triage"
        description="Queue management only. Open a visit to record vitals."
        endpoint="/nurse/queue/"
        errorMessage="Unable to load nurse queue."
        loadingMessage="Loading nurse queue..."
        emptyMessage="No patients match the current filters."
        getItems={getItems}
        mapItem={mapItem}
      />
    </DashboardShell>
  );
}
