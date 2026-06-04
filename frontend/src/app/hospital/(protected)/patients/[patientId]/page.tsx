"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { useParams } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";
import { HOSPITAL_NAV } from "@/lib/hospital/nav-config";
import { formatDateTime } from "@/lib/utils";

interface PatientProfile {
  student: {
    full_name: string;
    matric_number: string;
    gender?: string;
    date_of_birth?: string;
    phone_number?: string;
    blood_group?: string;
  };
  summary?: {
    known_allergies?: string[];
    chronic_conditions?: string[];
    recent_diagnoses?: string[];
    outstanding_followups?: unknown[];
    last_consultation_date?: string;
    last_doctor?: string;
  };
}

interface TimelineItem {
  kind: string;
  title: string;
  status: string;
  timestamp: string;
  staff?: string;
  action?: string;
  details?: {
    diagnosis?: string;
    items?: string[];
  };
}

export default function PatientRecordPage() {
  const params = useParams<{ patientId: string }>();
  const patientId = params.patientId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);

  const loadPatientRecord = useEffectEvent(async () => {
    if (!patientId) return;
    setLoading(true);
    setError("");
    try {
      const [profileRes, timelineRes] = await Promise.all([
        apiClient.get(`/doctor/students/${patientId}/medical-profile/`),
        apiClient.get(`/doctor/students/${patientId}/timeline/`),
      ]);
      if (profileRes.data?.success) setProfile(profileRes.data.data);
      if (timelineRes.data?.success) setTimeline(timelineRes.data.data || []);
    } catch {
      setError("Unable to load patient record.");
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPatientRecord();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [patientId]);

  return (
    <DashboardShell title="Patient Record" subtitle="Longitudinal medical profile" navItems={HOSPITAL_NAV.doctor} hideSidebar>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Demographics</CardTitle>
            <CardDescription>Basic patient details</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && <p className="text-sm text-slate-500">Loading patient record...</p>}
            {error && <p className="text-sm text-red-700">{error}</p>}
            {profile && (
              <div className="grid gap-3 md:grid-cols-2">
                <Info label="Full Name" value={profile.student.full_name} />
                <Info label="Matric Number" value={profile.student.matric_number} />
                <Info label="Gender" value={profile.student.gender || "N/A"} />
                <Info label="Date of Birth" value={profile.student.date_of_birth || "N/A"} />
                <Info label="Phone" value={profile.student.phone_number || "N/A"} />
                <Info label="Blood Group" value={profile.student.blood_group || "N/A"} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medical Summary</CardTitle>
            <CardDescription>Quick clinical summary</CardDescription>
          </CardHeader>
          <CardContent>
            {profile ? (
              <div className="grid gap-3 md:grid-cols-2">
                <Info label="Known Allergies" value={(profile.summary?.known_allergies || []).join(", ") || "None"} />
                <Info label="Chronic Conditions" value={(profile.summary?.chronic_conditions || []).join(", ") || "None"} />
                <Info label="Recent Diagnoses" value={(profile.summary?.recent_diagnoses || []).join(", ") || "None"} />
                <Info label="Outstanding Follow-ups" value={`${(profile.summary?.outstanding_followups || []).length || 0}`} />
                <Info label="Last Consultation" value={profile.summary?.last_consultation_date ? formatDateTime(profile.summary.last_consultation_date) : "N/A"} />
                <Info label="Last Doctor" value={profile.summary?.last_doctor || "N/A"} />
              </div>
            ) : (
              <p className="text-sm text-slate-500">No profile available.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest Visit Summary</CardTitle>
            <CardDescription>Most recent medical events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {timeline.length === 0 && <p className="text-sm text-slate-500">No timeline events.</p>}
            {timeline.slice(0, 5).map((item) => (
              <TimelineCard key={`${item.kind}-${item.timestamp}`} item={item} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patient Timeline</CardTitle>
            <CardDescription>Date, time, staff, and action; newest first.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {timeline.length === 0 && <p className="text-sm text-slate-500">No timeline events.</p>}
            {timeline.map((item, index) => (
              <TimelineCard key={`${item.kind}-${index}`} item={item} />
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-900">{value || "N/A"}</p>
    </div>
  );
}

function TimelineCard({ item }: { item: TimelineItem }) {
  return (
    <div className="rounded-md border border-slate-200 p-3 text-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-slate-900">{item.title}</p>
          <p className="text-xs uppercase tracking-wide text-teal-700">{item.action || item.kind}</p>
        </div>
        <p className="text-xs text-slate-500">{formatDateTime(item.timestamp)}</p>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Status: {item.status}
        {item.staff ? ` · Staff: ${item.staff}` : ""}
      </p>
      {item.details?.diagnosis && <p className="mt-2">Diagnosis: {item.details.diagnosis}</p>}
      {item.details?.items && <p className="mt-2">Items: {item.details.items.join(", ")}</p>}
    </div>
  );
}
