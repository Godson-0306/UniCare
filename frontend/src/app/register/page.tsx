"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";

const initialForm = {
  first_name: "",
  last_name: "",
  other_names: "",
  matric_number: "",
  faculty: "",
  department: "",
  level: "",
  date_of_birth: "",
  gender: "",
  phone_number: "",
  email: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  medical_notes: "",
  password: "",
};

export default function RegisterPage() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof initialForm, string>>>({});
  const [loading, setLoading] = useState(false);

  function updateField(field: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    setFieldErrors({});

    try {
      const { data } = await apiClient.post("/auth/student/register/", form);
      if (data.success) {
        setForm(initialForm);
        setStatus(`Registration successful for ${data.data.matric_number}. You can sign in now.`);
      }
    } catch (error) {
      const details =
        error && typeof error === "object" && "response" in error
          ? (
              error as {
                response?: {
                  data?: { error?: { details?: Record<string, string[] | string> } };
                };
              }
            ).response?.data?.error?.details
          : undefined;
      if (details && typeof details === "object") {
        const nextErrors: Partial<Record<keyof typeof initialForm, string>> = {};
        for (const [key, value] of Object.entries(details)) {
          if (key in initialForm) {
            nextErrors[key as keyof typeof initialForm] = Array.isArray(value) ? String(value[0]) : String(value);
          }
        }
        setFieldErrors(nextErrors);
      }
      setStatus(getApiErrorMessage(error, "Registration failed. Please review your details and try again."));
    } finally {
      setLoading(false);
    }
  }

  const fields: Array<{ label: string; field: keyof typeof initialForm; type?: string; required?: boolean; placeholder?: string }> = [
    { label: "First name", field: "first_name", required: true },
    { label: "Surname", field: "last_name", required: true },
    { label: "Other names", field: "other_names" },
    { label: "Matric number", field: "matric_number", required: true, placeholder: "U2024002" },
    { label: "Faculty", field: "faculty", required: true },
    { label: "Department", field: "department", required: true },
    { label: "Level", field: "level", required: true, placeholder: "300" },
    { label: "Date of birth", field: "date_of_birth", required: true, type: "date" },
    { label: "Gender", field: "gender", required: true },
    { label: "Phone number", field: "phone_number", required: true },
    { label: "Email address", field: "email", required: true, type: "email" },
    { label: "Emergency contact name", field: "emergency_contact_name", required: true },
    { label: "Emergency contact phone", field: "emergency_contact_phone", required: true },
    { label: "Password", field: "password", required: true, type: "password" },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-teal-50 via-white to-slate-50 p-4">
      <Card className="w-full max-w-4xl border-slate-200 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle>Create student account</CardTitle>
          <CardDescription>
            Register your UniCare student portal account. Verified medical conditions are doctor-controlled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={submitForm} className="grid gap-4 md:grid-cols-2">
            {fields.map(({ label, field, type = "text", required = false, placeholder }) => (
              <div key={field} className="space-y-2">
                <Label htmlFor={field}>{label}</Label>
                <Input
                  id={field}
                  type={type}
                  value={form[field]}
                  required={required}
                  placeholder={placeholder}
                  onChange={(event) => updateField(field, event.target.value)}
                />
                {fieldErrors[field] && <p className="text-xs text-red-700">{fieldErrors[field]}</p>}
              </div>
            ))}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="medical_notes">Medical notes (optional reference only)</Label>
              <textarea
                id="medical_notes"
                className="min-h-28 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder="Optional note for the clinic. Do not enter self-verified diagnoses or allergies."
                value={form.medical_notes}
                onChange={(event) => updateField("medical_notes", event.target.value)}
              />
              {fieldErrors.medical_notes && <p className="text-xs text-red-700">{fieldErrors.medical_notes}</p>}
            </div>
            <Button type="submit" className="md:col-span-2" disabled={loading}>
              {loading ? "Submitting..." : "Create account"}
            </Button>
          </form>
          {status && <p className={`text-sm ${status.toLowerCase().includes("successful") ? "text-teal-700" : "text-red-700"}`}>{status}</p>}
          <Button type="button" variant="outline" className="w-full" asChild>
            <Link href="/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
