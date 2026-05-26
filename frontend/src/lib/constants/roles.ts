import type { UserRole } from "@/types/auth";

export const HOSPITAL_ROLES: UserRole[] = [
  "receptionist",
  "nurse",
  "doctor",
  "pharmacist",
  "lab_technician",
  "duty_officer",
  "admin",
  "super_admin",
];

export const ROLE_DASHBOARD_PATH: Record<UserRole, string> = {
  student: "/student/dashboard",
  receptionist: "/hospital/reception",
  nurse: "/hospital/nurse",
  doctor: "/hospital/doctor",
  pharmacist: "/hospital/pharmacy",
  lab_technician: "/hospital/lab",
  duty_officer: "/hospital/duty",
  admin: "/hospital/admin",
  super_admin: "/hospital/admin",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  student: "Student",
  receptionist: "Reception",
  nurse: "Nursing",
  doctor: "Doctor",
  pharmacist: "Pharmacy",
  lab_technician: "Laboratory",
  duty_officer: "Duty Officer",
  admin: "Admin",
  super_admin: "Super Admin",
};
