import type { NavItem } from "@/components/layout/dashboard-shell";
import type { UserRole } from "@/types/auth";

export const HOSPITAL_NAV: Record<UserRole, NavItem[]> = {
  receptionist: [
    { label: "Patient Search", href: "/hospital/reception" },
    { label: "Create Visit", href: "/hospital/reception/visit" },
    { label: "Appointments", href: "/hospital/reception/appointments" },
  ],
  nurse: [
    { label: "Nurse Queue", href: "/hospital/nurse" },
    { label: "Record Vitals", href: "/hospital/nurse/vitals" },
  ],
  doctor: [
    { label: "Doctor Queue", href: "/hospital/doctor" },
    { label: "Consultation", href: "/hospital/doctor/consultation" },
  ],
  pharmacist: [
    { label: "Pharmacy Queue", href: "/hospital/pharmacy" },
  ],
  lab_technician: [
    { label: "Lab Queue", href: "/hospital/lab" },
  ],
  duty_officer: [
    { label: "Emergency Events", href: "/hospital/duty" },
  ],
  admin: [
    { label: "Analytics", href: "/hospital/admin" },
  ],
  super_admin: [
    { label: "Analytics", href: "/hospital/admin" },
  ],
  student: [],
};
