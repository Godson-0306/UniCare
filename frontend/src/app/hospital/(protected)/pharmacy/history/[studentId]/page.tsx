"use client";

import { ArrowLeft, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useEffectEvent, useMemo, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { HOSPITAL_NAV } from "@/lib/hospital/nav-config";
import { formatDateTime } from "@/lib/utils";

type PrescriptionStatus = "pending" | "partially_dispensed" | "dispensed" | "cancelled";

interface PrescriptionItem {
  id: string;
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string;
  is_dispensed: boolean;
  dispensed_at: string | null;
}

interface Prescription {
  id: string;
  prescription_number: string;
  status: PrescriptionStatus;
  student_name: string;
  matric_number: string;
  visit_number: string;
  prescribed_by: string;
  diagnosis: string;
  created_at: string;
  dispensed_at: string | null;
  items: PrescriptionItem[];
}

function statusVariant(status: PrescriptionStatus) {
  if (status === "dispensed") return "default" as const;
  if (status === "partially_dispensed") return "warning" as const;
  if (status === "cancelled") return "destructive" as const;
  return "secondary" as const;
}

export default function PharmacyHistoryPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId;
  const [history, setHistory] = useState<Prescription[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = useEffectEvent(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await apiClient.get(`/pharmacy/students/${studentId}/history/`);
      if (data.success) setHistory(data.data as Prescription[]);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load prescription history."));
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadHistory();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [studentId]);

  const filteredHistory = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return history;
    return history.filter((prescription) =>
      [prescription.prescription_number, prescription.visit_number, prescription.diagnosis, ...prescription.items.map((item) => item.drug_name)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [history, query]);

  const patient = history[0];

  return (
    <DashboardShell title="Pharmacy History" subtitle="Previous prescriptions and dispensing records" navItems={HOSPITAL_NAV.pharmacist} hideSidebar>
      <div className="space-y-6">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Prescription History</p>
            <h2 className="text-2xl font-semibold text-slate-950">{patient?.student_name ?? "Patient Prescriptions"}</h2>
            <p className="text-sm text-slate-500">{patient ? `${patient.matric_number} · Previous prescriptions and dispensing details` : "Review medication history."}</p>
          </div>
          <Button asChild variant="outline"><Link href="/hospital/pharmacy"><ArrowLeft className="h-4 w-4" /> Back to Pharmacy Queue</Link></Button>
        </header>

        <Card>
          <CardContent className="relative p-4">
            <Search className="absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Search prescription, visit, diagnosis, or medication" value={query} onChange={(event) => setQuery(event.target.value)} />
          </CardContent>
        </Card>

        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {loading && <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading prescription history...</p>}
        {!loading && filteredHistory.length === 0 && <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">No prescription history found.</p>}

        <section className="grid gap-4 xl:grid-cols-2">
          {filteredHistory.map((prescription) => (
            <Card key={prescription.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{prescription.prescription_number}</CardTitle>
                    <CardDescription>{prescription.visit_number || "No visit linked"} · {formatDateTime(prescription.created_at)}</CardDescription>
                  </div>
                  <Badge variant={statusVariant(prescription.status)}>{prescription.status.replaceAll("_", " ")}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Info label="Diagnosis" value={prescription.diagnosis || "N/A"} />
                <Info label="Prescribed By" value={prescription.prescribed_by || "Clinical team"} />
                <Info label="Dispensed At" value={prescription.dispensed_at ? formatDateTime(prescription.dispensed_at) : "Pending"} />
                <div className="rounded-md border border-slate-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Medications</p>
                  <div className="mt-2 space-y-2">
                    {prescription.items.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-3 rounded-md bg-slate-50 p-2">
                        <div>
                          <p className="font-medium text-slate-950">{item.drug_name}</p>
                          <p className="text-xs text-slate-500">{item.dosage} · {item.frequency} · {item.duration} · Qty {item.quantity}</p>
                        </div>
                        <Badge variant={item.is_dispensed ? "default" : "secondary"}>{item.is_dispensed ? "Dispensed" : "Pending"}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </DashboardShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-line text-slate-900">{value || "N/A"}</p>
    </div>
  );
}
