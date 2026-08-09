import { z } from "zod";

export const adminNamedTotalSchema = z.object({
  diagnosis: z.string().optional(),
  day: z.string().nullable().optional(),
  test_name: z.string().optional(),
  username: z.string().optional(),
  total: z.number(),
});

export const adminAnalyticsSchema = z.object({
  totals: z.object({
    patient_visits: z.number(),
    appointments: z.number(),
    prescriptions: z.number(),
    lab_requests: z.number(),
    emergency_cases: z.number(),
  }),
  most_common_diagnoses: z.array(adminNamedTotalSchema),
  pharmacy_usage_trends: z.array(adminNamedTotalSchema),
  lab_test_frequency: z.array(adminNamedTotalSchema),
  emergency_case_frequency: z.array(adminNamedTotalSchema),
  doctor_workload_distribution: z.array(adminNamedTotalSchema),
  window_days: z.number(),
});

export const createStudentSchema = z.object({
  matric_number: z.string().min(3),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  department: z.string().optional(),
  faculty: z.string().optional(),
  level: z.string().optional(),
  gender: z.string().optional(),
});

export const createWorkstationSchema = z.object({
  username: z.string().min(3),
  station_name: z.string().min(2),
  station_code: z.string().min(2),
  assigned_role: z.enum(["receptionist", "nurse", "doctor", "pharmacist", "lab_technician", "duty_officer"]),
  location: z.string().optional(),
});

export const WORKSTATION_ROLES = [
  "receptionist",
  "nurse",
  "doctor",
  "pharmacist",
  "lab_technician",
  "duty_officer",
] as const;
