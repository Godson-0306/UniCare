"use client";

import { useEffect, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";

function VisitItem({ visit }: { visit: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-slate-200 p-4 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">{visit.visit_number}</p>
          <p className="text-sm text-slate-700">{visit.chief_complaint}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-teal-700">{visit.status}</p>
          <p className="text-xs text-slate-400">{formatDateTime(visit.registered_at)}</p>
          <button onClick={() => setOpen((v) => !v)} className="mt-2 text-xs text-teal-600">
            {open ? "Hide details" : "View details"}
          </button>
        </div>
      </div>
      {open && (
        <pre className="mt-3 rounded bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(visit, null, 2)}</pre>
      )}
    </div>
  );
}

const studentNav = [
  { label: "Dashboard", href: "/student/dashboard" },
  { label: "Prescriptions", href: "/student/prescriptions" },
  { label: "Lab Results", href: "/student/lab-results" },
  { label: "Appointments", href: "/student/appointments" },
  { label: "Medical History", href: "/student/medical-history" },
  { label: "Notifications", href: "/student/notifications" },
];

interface MedicalRecord {
  id: string;
  title: string;
  details: string;
  record_type: string;
  diagnosed_at?: string;
  created_at: string;
}

interface MedicalProfileResponse {
  student: { full_name: string; matric_number: string; medical_notes: string };
  allergies: MedicalRecord[];
  conditions: MedicalRecord[];
  chronic_illnesses: MedicalRecord[];
  deformities: MedicalRecord[];
  special_notes: MedicalRecord[];
}

interface VisitHistoryItem {
  id: string;
  visit_number: string;
  chief_complaint: string;
  status: string;
  registered_at: string;
}

export default function StudentMedicalHistoryPage() {
  const [profile, setProfile] = useState<MedicalProfileResponse | null>(null);
  const [visits, setVisits] = useState<VisitHistoryItem[]>([]);

  useEffect(() => {
    async function load() {
      const [profileRes, visitsRes] = await Promise.all([
        apiClient.get("/student/medical-profile/"),
        apiClient.get("/student/medical-history/"),
      ]);

      if (profileRes.data.success) {
        setProfile(profileRes.data.data);
      }
      if (visitsRes.data.success) {
        setVisits(visitsRes.data.data);
      }
    }

    load().catch(() => {
      setProfile(null);
      setVisits([]);
    });
  }, []);

  const groups = [
    { title: "Verified Allergies", items: profile?.allergies ?? [] },
    { title: "Diagnosed Conditions", items: profile?.conditions ?? [] },
    { title: "Chronic Illnesses", items: profile?.chronic_illnesses ?? [] },
    { title: "Deformities", items: profile?.deformities ?? [] },
    { title: "Special Medical Notes", items: profile?.special_notes ?? [] },
  ];

  return (
    <DashboardShell title="Medical History" navItems={studentNav}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Verified Medical Profile</CardTitle>
            <CardDescription>
              Medical records below are verified and maintained by doctors only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile?.student && (
              <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-700">
                <p className="font-medium text-slate-900">{profile.student.full_name}</p>
                <p>{profile.student.matric_number}</p>
                <p className="mt-2 text-slate-600">
                  Student reference note: {profile.student.medical_notes || "No self-submitted notes."}
                </p>
              </div>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              {groups.map((group) => (
                <Card key={group.title} className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-base">{group.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {group.items.length === 0 && <p className="text-sm text-slate-500">No verified entries yet.</p>}
                    {group.items.map((item) => (
                      <div key={item.id} className="rounded-lg border border-slate-100 p-3">
                        <p className="font-medium text-slate-900">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{item.details || "No extra notes."}</p>
                        <p className="mt-2 text-xs text-slate-400">
                          {formatDateTime(item.diagnosed_at ?? item.created_at)}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visit History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {visits.length === 0 && <p className="text-sm text-slate-500">No visit history available.</p>}
            {visits.map((visit) => (
              <VisitItem key={visit.id} visit={visit} />
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
