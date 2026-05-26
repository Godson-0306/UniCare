export type UserRole =
  | "student"
  | "receptionist"
  | "nurse"
  | "doctor"
  | "pharmacist"
  | "lab_technician"
  | "duty_officer"
  | "admin"
  | "super_admin";

export type AccountType = "student" | "workstation" | "personal";

export type PortalType = "student" | "hospital" | null;

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  account_type: AccountType;
  email?: string;
  phone_number?: string;
}

export interface WorkstationInfo {
  id: string;
  station_name: string;
  station_code: string;
  assigned_role: UserRole;
  location: string;
  is_active: boolean;
}

export interface StudentProfile {
  id: string;
  matric_number: string;
  first_name: string;
  last_name: string;
  full_name: string;
  department: string;
  faculty: string;
  level: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthSession {
  user: AuthUser;
  tokens: AuthTokens;
  workstation?: WorkstationInfo;
  profile?: StudentProfile;
}
