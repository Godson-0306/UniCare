"use client";

import { ArrowLeft, CheckCircle2, Loader2, Pill, Save } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useMemo, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { HOSPITAL_NAV } from "@/lib/hospital/nav-config";
import { getNotificationsWebSocketUrl } from "@/lib/realtime";
import { formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

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
  dispensed_by: string;
}

interface Prescription {
  id: string;
  prescription_number: string;
  status: PrescriptionStatus;
  notes: string;
  student: {
    full_name: string;
    matric_number: string;
    allergies: string;
    chronic_conditions: string;
  };
  student_id: string;
  student_name: string;
  matric_number: string;
  visit_number: string;
  prescribed_by: string;
  diagnosis: string;
  allergies: string;
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

export default function PharmacyPrescriptionWorkspacePage() {
  const params = useParams<{ prescriptionId: string }>();
  const router = useRouter();
  const { user, workstation } = useAuthStore();
  const prescriptionId = params.prescriptionId;
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [history, setHistory] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingItemId, setSavingItemId] = useState("");
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  async function loadPrescription(showLoading = true) {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const { data } = await apiClient.get(`/pharmacy/prescriptions/${prescriptionId}/`);
      if (data.success) {
        const nextPrescription = data.data as Prescription;
        setPrescription(nextPrescription);
        const historyRes = await apiClient.get(`/pharmacy/students/${nextPrescription.student_id}/history/`);
        if (historyRes.data.success) setHistory(historyRes.data.data);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load prescription."));
    } finally {
      setLoading(false);
    }
  }

  const refreshPrescription = useEffectEvent((showLoading = false) => {
    void loadPrescription(showLoading);
  });

  useEffect(() => {
    const timer = window.setTimeout(() => refreshPrescription(true), 0);
    return () => window.clearTimeout(timer);
  }, [prescriptionId]);

  useEffect(() => {
    const socketUrl = getNotificationsWebSocketUrl();
    if (!socketUrl) return;
    const socket = new WebSocket(socketUrl);
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { event?: string };
      if (payload.event?.startsWith("prescription.")) refreshPrescription(false);
    };
    return () => socket.close();
  }, []);

  async function dispenseItem(item: PrescriptionItem) {
    if (!prescription || item.is_dispensed) return;
    setSavingItemId(item.id);
    setError("");
    setStatusMessage("");
    try {
      const { data } = await apiClient.post(`/pharmacy/prescriptions/${prescription.id}/items/${item.id}/dispense/`);
      if (data.success) {
        setPrescription(data.data as Prescription);
        setStatusMessage(`${item.drug_name} marked dispensed.`);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, `Unable to dispense ${item.drug_name}.`));
    } finally {
      setSavingItemId("");
    }
  }

  async function completeDispensing() {
    if (!prescription) return;
    setCompleting(true);
    setError("");
    setStatusMessage("");
    try {
      const { data } = await apiClient.post(`/pharmacy/prescriptions/${prescription.id}/dispense/`);
      if (data.success) {
        setStatusMessage("Dispensing completed. Returning to pharmacy queue...");
        window.setTimeout(() => router.push("/hospital/pharmacy"), 700);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to complete dispensing."));
    } finally {
      setCompleting(false);
    }
  }

  const allItemsDispensed = useMemo(() => Boolean(prescription?.items.length) && prescription!.items.every((item) => item.is_dispensed), [prescription]);

  if (loading) {
    return (
      <DashboardShell title="Dispensing Workspace" subtitle="Loading prescription" navItems={HOSPITAL_NAV.pharmacist} hideSidebar>
        <Card><CardContent className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading prescription...</CardContent></Card>
      </DashboardShell>
    );
  }

  if (!prescription) {
    return (
      <DashboardShell title="Dispensing Workspace" subtitle="Prescription unavailable" navItems={HOSPITAL_NAV.pharmacist} hideSidebar>
        <Card><CardContent className="space-y-4 p-6"><p className="text-sm text-red-700">{error || "Unable to load this prescription."}</p><Button asChild variant="outline"><Link href="/hospital/pharmacy">Back to Pharmacy Queue</Link></Button></CardContent></Card>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Dispensing Workspace" subtitle="Individual prescription processing" navItems={HOSPITAL_NAV.pharmacist} hideSidebar>
      <div className="space-y-6">
        <header className="sticky top-16 z-30 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold text-slate-950">{prescription.student_name}</h2>
                <Badge variant={statusVariant(prescription.status)}>{prescription.status.replaceAll("_", " ")}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {prescription.matric_number} · Visit {prescription.visit_number} · {prescription.prescription_number} · Prescribed {formatDateTime(prescription.created_at)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline"><Link href="/hospital/pharmacy"><ArrowLeft className="h-4 w-4" /> Back to Queue</Link></Button>
              <Button type="button" onClick={() => void completeDispensing()} disabled={completing || prescription.status === "dispensed"}>
                {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Complete Dispensing
              </Button>
            </div>
          </div>
        </header>

        {(error || statusMessage) && (
          <div className="space-y-2">
            {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {statusMessage && <p className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">{statusMessage}</p>}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Patient Summary</CardTitle>
                <CardDescription>Medication safety context.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Info label="Name" value={prescription.student_name} />
                <Info label="Matric Number" value={prescription.matric_number} />
                <Info label="Visit ID" value={prescription.visit_number || "N/A"} />
                <Info label="Allergies" value={prescription.allergies || prescription.student.allergies || "No allergies documented"} />
                <Info label="Current Diagnoses" value={prescription.diagnosis || "No diagnosis recorded"} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Previous Prescriptions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {history.filter((item) => item.id !== prescription.id).slice(0, 8).length === 0 && <p className="rounded-md bg-slate-50 p-3 text-slate-500">No previous prescriptions.</p>}
                {history.filter((item) => item.id !== prescription.id).slice(0, 8).map((item) => (
                  <Link key={item.id} href={`/hospital/pharmacy/history/${prescription.student_id}`} className="block rounded-md border border-slate-200 p-3 hover:border-teal-300 hover:bg-teal-50">
                    <p className="font-medium text-slate-900">{item.prescription_number}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(item.created_at)} · {item.status.replaceAll("_", " ")}</p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </aside>

          <main className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Pill className="h-5 w-5 text-teal-700" /> Prescription Table</CardTitle>
                <CardDescription>Mark each medication dispensed, then complete the prescription.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-3 pr-3">Medication</th>
                      <th className="py-3 pr-3">Dosage</th>
                      <th className="py-3 pr-3">Frequency</th>
                      <th className="py-3 pr-3">Duration</th>
                      <th className="py-3 pr-3">Qty</th>
                      <th className="py-3 pr-3">Instructions</th>
                      <th className="py-3 pr-3">Dispense Status</th>
                      <th className="py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {prescription.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3 pr-3 font-medium text-slate-950">{item.drug_name}</td>
                        <td className="py-3 pr-3">{item.dosage}</td>
                        <td className="py-3 pr-3">{item.frequency}</td>
                        <td className="py-3 pr-3">{item.duration}</td>
                        <td className="py-3 pr-3">{item.quantity}</td>
                        <td className="py-3 pr-3">{item.instructions || "N/A"}</td>
                        <td className="py-3 pr-3">
                          <div className="space-y-1">
                            <Badge variant={item.is_dispensed ? "default" : "secondary"}>{item.is_dispensed ? "Dispensed" : "Pending"}</Badge>
                            {item.dispensed_at && <p className="text-xs text-slate-500">{formatDateTime(item.dispensed_at)}</p>}
                            {item.dispensed_by && <p className="text-xs text-slate-500">By {item.dispensed_by}</p>}
                          </div>
                        </td>
                        <td className="py-3">
                          <Button type="button" size="sm" variant={item.is_dispensed ? "outline" : "default"} onClick={() => void dispenseItem(item)} disabled={item.is_dispensed || savingItemId === item.id}>
                            {savingItemId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Mark Dispensed
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            {!allItemsDispensed && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">Complete dispensing remains available for final override, but individual medication tracking is recommended.</p>}
            <Card>
              <CardHeader>
                <CardTitle>Dispensing Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm md:grid-cols-3">
                <Info label="Prescribing Doctor" value={prescription.prescribed_by || "Clinical team"} />
                <Info label="Dispensed By" value={workstation?.station_name ?? user?.username ?? "Pharmacy"} />
                <Info label="Dispensed At" value={prescription.dispensed_at ? formatDateTime(prescription.dispensed_at) : "Pending"} />
              </CardContent>
            </Card>
          </main>
        </div>
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
