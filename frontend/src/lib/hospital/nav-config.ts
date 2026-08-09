import type { NavItem } from "@/components/layout/dashboard-shell";
import type { UserRole } from "@/types/auth";

export const HOSPITAL_NAV: Record<UserRole, NavItem[]> = {
  receptionist: [
    { label: "Patient Search", href: "/hospital/reception" },
    { label: "Chat", href: "/hospital/reception/chat" },
    { label: "Appointments", href: "/hospital/reception/appointments" },
  ],
  nurse: [
    { label: "Nurse Queue", href: "/hospital/nurse" },
  ],
  doctor: [
    { label: "Doctor Queue", href: "/hospital/doctor" },
    { label: "Follow-ups", href: "/hospital/doctor/followups" },
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
    { label: "Overview", href: "/hospital/admin" },
    { label: "Analytics", href: "/hospital/admin/analytics" },
    { label: "Audit", href: "/hospital/admin/audit" },
    { label: "Users", href: "/hospital/admin/users" },
    { label: "Workstations", href: "/hospital/admin/workstations" },
    { label: "Live ops", href: "/hospital/admin/ops" },
    { label: "Emergencies", href: "/hospital/admin/emergencies" },
    { label: "Appointments", href: "/hospital/admin/appointments" },
  ],
  super_admin: [
    { label: "Overview", href: "/hospital/admin" },
    { label: "Analytics", href: "/hospital/admin/analytics" },
    { label: "Audit", href: "/hospital/admin/audit" },
    { label: "Users", href: "/hospital/admin/users" },
    { label: "Workstations", href: "/hospital/admin/workstations" },
    { label: "Live ops", href: "/hospital/admin/ops" },
    { label: "Emergencies", href: "/hospital/admin/emergencies" },
    { label: "Appointments", href: "/hospital/admin/appointments" },
  ],
  student: [],
};
