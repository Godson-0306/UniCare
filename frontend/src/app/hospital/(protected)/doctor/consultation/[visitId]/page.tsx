"use client";

import {
  Activity,
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  FlaskConical,
  HeartPulse,
  History,
  Loader2,
  Pill,
  Plus,
  Save,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useMemo, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { HOSPITAL_NAV } from "@/lib/hospital/nav-config";
import { generateId } from "@/lib/id";
import { getNotificationsWebSocketUrl } from "@/lib/realtime";
import { formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

interface VisitDetail {
  id: string;
  visit_number: string;
  status: string;
  priority: "normal" | "urgent" | "emergency";
  chief_complaint: string;
  reception_notes: string;
  registered_at: string;
  is_emergency: boolean;
  student: {
    id: string;
    matric_number: string;
    full_name: string;
    department: string;
    faculty: string;
    level: string;
    date_of_birth?: string | null;
    gender: string;
    blood_group?: string;
    phone_number?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    medical_notes?: string;
    allergies?: string;
    chronic_conditions?: string;
  };
  vitals_records: Array<{
    id: string;
    temperature_c?: string | null;
    blood_pressure_systolic?: number | null;
    blood_pressure_diastolic?: number | null;
    pulse_rate?: number | null;
    respiratory_rate?: number | null;
    weight_kg?: string | null;
    height_cm?: string | null;
    spo2?: number | null;
    intake_notes?: string;
    created_at: string;
  }>;
  consultation?: {
    id: string;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    diagnosis: string;
    follow_up_notes: string;
    created_at: string;
    updated_at: string;
  } | null;
}

interface MedicalRecord {
  id: string;
  title: string;
  details: string;
  record_type: "allergy" | "diagnosed_condition" | "chronic_illness" | "deformity" | "special_note";
  created_at: string;
}

interface TimelineItem {
  kind: string;
  title: string;
  status: string;
  timestamp: string;
  visit_id?: string | null;
  details?: Record<string, unknown>;
}

interface InvestigationRow {
  id: string;
  test_name: string;
  priority: "routine" | "urgent";
  clinical_notes: string;
}

interface PrescriptionRow {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: string;
  instructions: string;
}

const supportedInvestigations = [
  "Full Blood Count",
  "Malaria Test",
  "Urinalysis",
  "Blood Sugar",
  "Stool Analysis",
  "X-Ray",
  "Ultrasound",
  "MRI",
  "CT Scan",
];

const emptyExam = {
  general_appearance: "",
  heent: "",
  cardiovascular: "",
  respiratory: "",
  abdominal: "",
  neurological: "",
  musculoskeletal: "",
  additional_findings: "",
};

const emptyDiagnosis = {
  primary_diagnosis: "",
  secondary_diagnosis: "",
  differential_diagnosis: "",
  icd10_code: "",
};

const emptyTreatmentPlan = {
  management_plan: "",
  lifestyle_advice: "",
  monitoring_instructions: "",
  home_care_instructions: "",
};

function newInvestigation(): InvestigationRow {
  return { id: generateId("investigation"), test_name: "", priority: "routine", clinical_notes: "" };
}

function newPrescription(): PrescriptionRow {
  return { id: generateId("prescription"), medication: "", dosage: "", frequency: "", duration: "", quantity: "1", instructions: "" };
}

function calculateAge(dateOfBirth?: string | null) {
  if (!dateOfBirth) return "N/A";
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return "N/A";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return `${age}`;
}

function calculateBmi(weight?: string | null, height?: string | null) {
  const weightValue = Number(weight);
  const heightCm = Number(height);
  if (!weightValue || !heightCm) return "N/A";
  const heightM = heightCm / 100;
  return (weightValue / (heightM * heightM)).toFixed(1);
}

function formatBp(systolic?: number | null, diastolic?: number | null) {
  return systolic && diastolic ? `${systolic}/${diastolic} mmHg` : "N/A";
}

function recordsByType(records: MedicalRecord[], type: MedicalRecord["record_type"]) {
  return records.filter((record) => record.record_type === type);
}

export default function DoctorVisitConsultationPage() {
  const params = useParams<{ visitId: string }>();
  const router = useRouter();
  const { user, workstation } = useAuthStore();
  const visitId = params.visitId;
  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [history, setHistory] = useState<VisitDetail[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [selectedHistoryVisit, setSelectedHistoryVisit] = useState<VisitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [hpi, setHpi] = useState("");
  const [exam, setExam] = useState(emptyExam);
  const [diagnosis, setDiagnosis] = useState(emptyDiagnosis);
  const [investigations, setInvestigations] = useState<InvestigationRow[]>([newInvestigation()]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([newPrescription()]);
  const [treatmentPlan, setTreatmentPlan] = useState(emptyTreatmentPlan);
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [outcome, setOutcome] = useState("treated_discharged");

  const loadContext = useEffectEvent(async () => {
    if (!visitId) return;
    setLoading(true);
    setError("");
    try {
      const visitRes = await apiClient.get(`/doctor/visits/${visitId}/`);
      if (!visitRes.data.success) return;
      const loadedVisit = visitRes.data.data as VisitDetail;
      setVisit(loadedVisit);
      const [profileRes, historyRes, timelineRes] = await Promise.all([
        apiClient.get(`/doctor/students/${loadedVisit.student.id}/medical-profile/`),
        apiClient.get(`/doctor/students/${loadedVisit.student.id}/history/`),
        apiClient.get(`/doctor/students/${loadedVisit.student.id}/timeline/`),
      ]);
      if (profileRes.data.success) setMedicalRecords(profileRes.data.data.records);
      if (historyRes.data.success) setHistory(historyRes.data.data);
      if (timelineRes.data.success) setTimeline(timelineRes.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load consultation record."));
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    void loadContext();
  }, [visitId]);

  useEffect(() => {
    const socketUrl = getNotificationsWebSocketUrl();
    if (!socketUrl) return;
    const socket = new WebSocket(socketUrl);
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { event?: string };
      if (payload.event?.startsWith("lab.") || payload.event?.startsWith("prescription.") || payload.event?.startsWith("appointment.")) {
        void loadContext();
      }
    };
    return () => socket.close();
  }, []);

  async function completeConsultation() {
    if (!visit || saving) return;
    setSaving(true);
    setStatusMessage("");
    setError("");
    try {
      const cleanInvestigations = investigations.filter((item) => item.test_name.trim());
      const cleanPrescriptions = prescriptions.filter((item) => item.medication.trim());
      const { data } = await apiClient.post("/doctor/consultations/", {
        visit_id: visit.id,
        hpi,
        physical_exam: exam,
        ...diagnosis,
        investigations: cleanInvestigations,
        prescriptions: cleanPrescriptions.map((item) => ({ ...item, quantity: Number(item.quantity) || 1 })),
        treatment_plan: treatmentPlan,
        follow_up_required: followUpRequired,
        follow_up_date: followUpRequired && followUpDate ? new Date(followUpDate).toISOString() : null,
        follow_up_notes: followUpNotes,
        outcome,
      });
      if (data.success) {
        setStatusMessage("Consultation completed. Returning to the doctor queue...");
        window.setTimeout(() => router.push("/hospital/doctor"), 700);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to complete consultation."));
    } finally {
      setSaving(false);
    }
  }

  const latestVitals = visit?.vitals_records[0];
  const allergies = recordsByType(medicalRecords, "allergy");
  const chronicIllnesses = recordsByType(medicalRecords, "chronic_illness");
  const previousDiagnoses = recordsByType(medicalRecords, "diagnosed_condition");
  const specialNotes = medicalRecords.filter((record) => record.record_type === "deformity" || record.record_type === "special_note");
  const recentConsultations = useMemo(
    () => history.filter((item) => item.consultation && item.id !== visit?.id).slice(0, 10),
    [history, visit?.id]
  );

  if (loading) {
    return (
      <DashboardShell title="Consultation EMR" subtitle="Loading patient record" navItems={HOSPITAL_NAV.doctor} hideSidebar>
        <Card>
          <CardContent className="flex items-center gap-2 p-6 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading consultation workspace...
          </CardContent>
        </Card>
      </DashboardShell>
    );
  }

  if (!visit) {
    return (
      <DashboardShell title="Consultation EMR" subtitle="Patient record unavailable" navItems={HOSPITAL_NAV.doctor} hideSidebar>
        <Card>
          <CardContent className="space-y-4 p-6">
            <p className="text-sm text-red-700">{error || "Unable to load this visit."}</p>
            <Button asChild variant="outline"><Link href="/hospital/doctor">Return to Queue</Link></Button>
          </CardContent>
        </Card>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Consultation EMR" subtitle="One-patient clinical workspace" navItems={HOSPITAL_NAV.doctor} hideSidebar>
      <div className="space-y-6">
        <header className="sticky top-16 z-30 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold text-slate-950">{visit.student.full_name}</h2>
                {(visit.is_emergency || visit.priority === "emergency") && <Badge variant="destructive">Emergency</Badge>}
                {visit.priority === "urgent" && <Badge variant="warning">Urgent</Badge>}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {visit.student.matric_number} · Visit {visit.visit_number} · {calculateAge(visit.student.date_of_birth)} yrs · {visit.student.gender || "N/A"} · {visit.student.blood_group || "Blood group N/A"} · {formatDateTime(visit.registered_at)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline"><Link href="/hospital/doctor">Back to Queue</Link></Button>
              <Button type="button" onClick={() => void completeConsultation()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Complete Consultation
              </Button>
            </div>
          </div>
        </header>

        {(statusMessage || error) && (
          <div className="space-y-2">
            {statusMessage && <p className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">{statusMessage}</p>}
            {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          </div>
        )}

        <div className="grid gap-6 2xl:grid-cols-[320px_minmax(0,1fr)_340px]">
          <aside className="space-y-5">
            <PatientSummary visit={visit} />
            <MedicalHistory allergies={allergies} chronicIllnesses={chronicIllnesses} previousDiagnoses={previousDiagnoses} specialNotes={specialNotes} />
            <RecentConsultations consultations={recentConsultations} onSelect={setSelectedHistoryVisit} />
          </aside>

          <main className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Stethoscope className="h-5 w-5 text-teal-700" /> Consultation Form</CardTitle>
                <CardDescription>Focused clinical documentation for this visit only.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <ReadOnlyField label="Chief Complaint" value={visit.chief_complaint || "N/A"} />
                <TextArea label="History of Present Illness" value={hpi} onChange={setHpi} minHeight="min-h-36" />
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Physical Examination</h3>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {Object.entries(exam).map(([key, value]) => (
                      <TextArea key={key} label={key.replaceAll("_", " ")} value={value} onChange={(next) => setExam((current) => ({ ...current, [key]: next }))} />
                    ))}
                  </div>
                </section>
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Diagnosis</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <TextField label="Primary Diagnosis" value={diagnosis.primary_diagnosis} onChange={(value) => setDiagnosis((current) => ({ ...current, primary_diagnosis: value }))} />
                    <TextField label="Secondary Diagnosis" value={diagnosis.secondary_diagnosis} onChange={(value) => setDiagnosis((current) => ({ ...current, secondary_diagnosis: value }))} />
                    <TextField label="Differential Diagnosis" value={diagnosis.differential_diagnosis} onChange={(value) => setDiagnosis((current) => ({ ...current, differential_diagnosis: value }))} />
                    <TextField label="ICD-10 Code" value={diagnosis.icd10_code} onChange={(value) => setDiagnosis((current) => ({ ...current, icd10_code: value }))} />
                  </div>
                </section>
              </CardContent>
            </Card>

            <InvestigationsSection investigations={investigations} setInvestigations={setInvestigations} />
            <PrescriptionsSection prescriptions={prescriptions} setPrescriptions={setPrescriptions} />
            <TreatmentPlanSection treatmentPlan={treatmentPlan} setTreatmentPlan={setTreatmentPlan} />
            <FollowUpOutcomeSection
              followUpRequired={followUpRequired}
              setFollowUpRequired={setFollowUpRequired}
              followUpDate={followUpDate}
              setFollowUpDate={setFollowUpDate}
              followUpNotes={followUpNotes}
              setFollowUpNotes={setFollowUpNotes}
              outcome={outcome}
              setOutcome={setOutcome}
            />
          </main>

          <aside className="space-y-5">
            <VitalsCard visit={visit} latestVitals={latestVitals} />
            <TimelinePanel timeline={timeline} />
            <Card>
              <CardHeader>
                <CardTitle>Doctor Details</CardTitle>
                <CardDescription>Used for audit logging and care attribution.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Info label="Doctor" value={user?.username ?? "Doctor"} />
                <Info label="Station" value={workstation?.station_name ?? "Clinical Services"} />
                <Info label="Date" value={formatDateTime(new Date())} />
              </CardContent>
            </Card>
          </aside>
        </div>

        {selectedHistoryVisit && (
          <ConsultationDetailsModal
            visit={selectedHistoryVisit}
            timeline={timeline.filter((item) => item.visit_id === selectedHistoryVisit.id)}
            onClose={() => setSelectedHistoryVisit(null)}
          />
        )}
      </div>
    </DashboardShell>
  );
}

function PatientSummary({ visit }: { visit: VisitDetail }) {
  const student = visit.student;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5 text-teal-700" /> Patient Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Info label="Matric Number" value={student.matric_number} />
        <Info label="Department" value={student.department || "N/A"} />
        <Info label="Faculty / Level" value={`${student.faculty || "N/A"} · ${student.level || "N/A"}`} />
        <Info label="Phone" value={student.phone_number || "N/A"} />
        <Info label="Emergency Contact" value={`${student.emergency_contact_name || "N/A"} ${student.emergency_contact_phone || ""}`} />
        <Info label="Insurance Information" value="University health coverage" />
        <Info label="Blood Group" value={student.blood_group || "N/A"} />
      </CardContent>
    </Card>
  );
}

function MedicalHistory(props: { allergies: MedicalRecord[]; chronicIllnesses: MedicalRecord[]; previousDiagnoses: MedicalRecord[]; specialNotes: MedicalRecord[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-teal-700" /> Medical History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <RecordGroup title="Allergies" records={props.allergies} emptyText="No verified allergies." />
        <RecordGroup title="Chronic Illnesses" records={props.chronicIllnesses} emptyText="No chronic illnesses." />
        <RecordGroup title="Current Medications" records={[]} emptyText="No active medication record." />
        <RecordGroup title="Previous Diagnoses" records={props.previousDiagnoses} emptyText="No previous diagnoses." />
        <RecordGroup title="Previous Surgeries" records={props.specialNotes} emptyText="No previous surgery notes." />
      </CardContent>
    </Card>
  );
}

function RecentConsultations({ consultations, onSelect }: { consultations: VisitDetail[]; onSelect: (visit: VisitDetail) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-teal-700" /> Recent Consultations</CardTitle>
        <CardDescription>Last 10 consultation records.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {consultations.length === 0 && <p className="rounded-md bg-slate-50 p-3 text-slate-500">No previous consultations.</p>}
        {consultations.map((item) => (
          <button key={item.id} type="button" onClick={() => onSelect(item)} className="w-full rounded-md border border-slate-200 p-3 text-left hover:border-teal-300 hover:bg-teal-50">
            <p className="font-semibold text-teal-700">{formatDateTime(item.registered_at)}</p>
            <p className="text-slate-900">{item.consultation?.diagnosis || item.consultation?.assessment || "No diagnosis recorded"}</p>
            <p className="text-xs text-slate-500">Doctor: Clinical Services</p>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function VitalsCard({ visit, latestVitals }: { visit: VisitDetail; latestVitals: VisitDetail["vitals_records"][number] | undefined }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><HeartPulse className="h-5 w-5 text-teal-700" /> Clinical Information</CardTitle>
        <CardDescription>Triage and vitals are read-only.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Info label="Temperature" value={latestVitals?.temperature_c ? `${latestVitals.temperature_c} °C` : "N/A"} />
        <Info label="Blood Pressure" value={formatBp(latestVitals?.blood_pressure_systolic, latestVitals?.blood_pressure_diastolic)} />
        <Info label="Pulse" value={latestVitals?.pulse_rate ? `${latestVitals.pulse_rate} bpm` : "N/A"} />
        <Info label="Respiratory Rate" value={latestVitals?.respiratory_rate ? `${latestVitals.respiratory_rate} /min` : "N/A"} />
        <Info label="Oxygen Saturation" value={latestVitals?.spo2 ? `${latestVitals.spo2}%` : "N/A"} />
        <Info label="Weight" value={latestVitals?.weight_kg ? `${latestVitals.weight_kg} kg` : "N/A"} />
        <Info label="Height" value={latestVitals?.height_cm ? `${latestVitals.height_cm} cm` : "N/A"} />
        <Info label="BMI" value={calculateBmi(latestVitals?.weight_kg, latestVitals?.height_cm)} />
        <Info label="Nurse Notes" value={latestVitals?.intake_notes || visit.reception_notes || "N/A"} />
      </CardContent>
    </Card>
  );
}

function InvestigationsSection({ investigations, setInvestigations }: { investigations: InvestigationRow[]; setInvestigations: (rows: InvestigationRow[]) => void }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-teal-700" /> Investigations</CardTitle>
          <CardDescription>Create multiple lab or imaging requests under this visit.</CardDescription>
        </div>
        <Button type="button" variant="outline" onClick={() => setInvestigations([...investigations, newInvestigation()])}><Plus className="h-4 w-4" /> Add Investigation</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <datalist id="supported-investigations">{supportedInvestigations.map((test) => <option key={test} value={test} />)}</datalist>
        {investigations.map((item) => (
          <div key={item.id} className="grid gap-3 rounded-md border border-slate-200 p-3 lg:grid-cols-[1fr_130px_1.2fr_auto]">
            <Input list="supported-investigations" placeholder="Test name" value={item.test_name} onChange={(event) => setInvestigations(investigations.map((row) => row.id === item.id ? { ...row, test_name: event.target.value } : row))} />
            <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={item.priority} onChange={(event) => setInvestigations(investigations.map((row) => row.id === item.id ? { ...row, priority: event.target.value as InvestigationRow["priority"] } : row))}>
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
            </select>
            <Input placeholder="Clinical notes" value={item.clinical_notes} onChange={(event) => setInvestigations(investigations.map((row) => row.id === item.id ? { ...row, clinical_notes: event.target.value } : row))} />
            <Button type="button" variant="ghost" size="icon" onClick={() => setInvestigations(investigations.length === 1 ? [newInvestigation()] : investigations.filter((row) => row.id !== item.id))}><X className="h-4 w-4" /></Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PrescriptionsSection({ prescriptions, setPrescriptions }: { prescriptions: PrescriptionRow[]; setPrescriptions: (rows: PrescriptionRow[]) => void }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2"><Pill className="h-5 w-5 text-teal-700" /> Prescriptions</CardTitle>
          <CardDescription>Structured medications are sent to pharmacy when consultation is completed.</CardDescription>
        </div>
        <Button type="button" variant="outline" onClick={() => setPrescriptions([...prescriptions, newPrescription()])}><Plus className="h-4 w-4" /> Add Medication</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {prescriptions.map((item) => (
          <div key={item.id} className="grid gap-3 rounded-md border border-slate-200 p-3 xl:grid-cols-[1fr_0.8fr_0.8fr_0.8fr_90px_1fr_auto]">
            {(["medication", "dosage", "frequency", "duration", "quantity", "instructions"] as const).map((field) => (
              <Input key={field} placeholder={field.replace("_", " ")} value={item[field]} onChange={(event) => setPrescriptions(prescriptions.map((row) => row.id === item.id ? { ...row, [field]: event.target.value } : row))} />
            ))}
            <Button type="button" variant="ghost" size="icon" onClick={() => setPrescriptions(prescriptions.length === 1 ? [newPrescription()] : prescriptions.filter((row) => row.id !== item.id))}><X className="h-4 w-4" /></Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TreatmentPlanSection({ treatmentPlan, setTreatmentPlan }: { treatmentPlan: typeof emptyTreatmentPlan; setTreatmentPlan: (value: typeof emptyTreatmentPlan) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-teal-700" /> Treatment Plan</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {Object.entries(treatmentPlan).map(([key, value]) => (
          <TextArea key={key} label={key.replaceAll("_", " ")} value={value} onChange={(next) => setTreatmentPlan({ ...treatmentPlan, [key]: next })} />
        ))}
      </CardContent>
    </Card>
  );
}

function FollowUpOutcomeSection(props: {
  followUpRequired: boolean;
  setFollowUpRequired: (value: boolean) => void;
  followUpDate: string;
  setFollowUpDate: (value: string) => void;
  followUpNotes: string;
  setFollowUpNotes: (value: string) => void;
  outcome: string;
  setOutcome: (value: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-teal-700" /> Follow-up & Outcome</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        <label className="flex items-center gap-2 rounded-md border border-slate-200 p-3 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={props.followUpRequired} onChange={(event) => props.setFollowUpRequired(event.target.checked)} />
          Follow-up required
        </label>
        <TextField label="Follow-up Date" type="datetime-local" value={props.followUpDate} onChange={props.setFollowUpDate} disabled={!props.followUpRequired} />
        <TextArea label="Follow-up Notes" value={props.followUpNotes} onChange={props.setFollowUpNotes} />
        <div className="space-y-2">
          <Label htmlFor="outcome">Consultation Outcome</Label>
          <select id="outcome" className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={props.outcome} onChange={(event) => props.setOutcome(event.target.value)}>
            <option value="treated_discharged">Treated and Discharged</option>
            <option value="referred_laboratory">Referred to Laboratory</option>
            <option value="referred_imaging">Referred for Imaging</option>
            <option value="referred_specialist">Referred to Specialist</option>
            <option value="admitted">Admitted</option>
            <option value="emergency_admission">Emergency Admission</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );
}

function TimelinePanel({ timeline }: { timeline: TimelineItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-teal-700" /> Patient Timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {timeline.length === 0 && <p className="text-sm text-slate-500">No timeline available.</p>}
        {timeline.slice(0, 14).map((item, index) => (
          <div key={`${item.kind}-${index}`} className="border-l-2 border-teal-200 pl-3 text-sm">
            <p className="font-medium text-slate-900">{item.title}</p>
            <p className="text-xs uppercase tracking-wide text-teal-700">{item.kind}</p>
            <p className="text-xs text-slate-500">{formatDateTime(item.timestamp)} · {item.status}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ConsultationDetailsModal({ visit, timeline, onClose }: { visit: VisitDetail; timeline: TimelineItem[]; onClose: () => void }) {
  const consultation = visit.consultation;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 md:items-center md:p-6">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl md:rounded-2xl">
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-slate-200 bg-white p-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Consultation Details</h3>
            <p className="text-sm text-slate-500">{formatDateTime(visit.registered_at)} · Visit {visit.visit_number}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <ReadOnlyField label="Diagnosis" value={consultation?.diagnosis || consultation?.assessment || "N/A"} />
          <ReadOnlyField label="Physical Examination" value={consultation?.objective || "N/A"} />
          <ReadOnlyField label="Treatment Plan" value={consultation?.plan || "N/A"} />
          <ReadOnlyField label="Follow-up Notes" value={consultation?.follow_up_notes || "N/A"} />
          <section className="space-y-2 md:col-span-2">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Prescriptions, Lab Requests, Lab Results, Outcome</h4>
            {timeline.length === 0 && <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-500">No linked timeline events.</p>}
            {timeline.map((item, index) => (
              <div key={`${item.kind}-${index}`} className="rounded-md border border-slate-200 p-3 text-sm">
                <p className="font-semibold text-slate-900">{item.title}</p>
                <p className="text-xs text-teal-700">{item.kind} · {item.status} · {formatDateTime(item.timestamp)}</p>
                {item.details?.summary && <p className="mt-2 whitespace-pre-line text-slate-600">{String(item.details.summary)}</p>}
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, type = "text", disabled = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; disabled?: boolean }) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="capitalize">{label}</Label>
      <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />
    </div>
  );
}

function TextArea({ label, value, onChange, minHeight = "min-h-24" }: { label: string; value: string; onChange: (value: string) => void; minHeight?: string }) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="capitalize">{label}</Label>
      <textarea id={id} className={`${minHeight} w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500`} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-line text-sm text-slate-900">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-slate-900">{value || "N/A"}</p>
    </div>
  );
}

function RecordGroup({ title, records, emptyText }: { title: string; records: MedicalRecord[]; emptyText: string }) {
  return (
    <section className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      {records.length === 0 && <p className="rounded-md bg-slate-50 p-3 text-slate-500">{emptyText}</p>}
      {records.map((record) => (
        <div key={record.id} className="rounded-md border border-slate-200 p-3">
          <p className="font-medium text-slate-900">{record.title}</p>
          {record.details && <p className="mt-1 text-slate-600">{record.details}</p>}
        </div>
      ))}
    </section>
  );
}
