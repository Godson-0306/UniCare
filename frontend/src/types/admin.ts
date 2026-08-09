export interface AdminNamedTotal {
  diagnosis?: string;
  day?: string | null;
  test_name?: string;
  username?: string;
  total: number;
}

export interface AdminAnalytics {
  totals: {
    patient_visits: number;
    appointments: number;
    prescriptions: number;
    lab_requests: number;
    emergency_cases: number;
  };
  most_common_diagnoses: AdminNamedTotal[];
  pharmacy_usage_trends: AdminNamedTotal[];
  lab_test_frequency: AdminNamedTotal[];
  emergency_case_frequency: AdminNamedTotal[];
  doctor_workload_distribution: AdminNamedTotal[];
  window_days: number;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  performed_by: string | null;
  workstation_name: string;
  role: string;
  visit_id: string | null;
  emergency_event_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  ip_address?: string | null;
}

export interface AdminPaginated<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
}

export interface AdminOverview {
  active_visits: number;
  visits_by_status: Record<string, number>;
  queue_by_stage: Record<string, { waiting: number; in_progress: number }>;
  open_emergencies_count: number;
  open_emergencies: Array<{
    id: string;
    status: string;
    student: string;
    matric_number: string;
    description: string;
    created_at: string;
  }>;
  todays_appointments: number;
  workstations_online: number;
  workstations_total: number;
  recent_audit: AdminAuditLog[];
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  phone_number: string;
  role: string;
  account_type: string;
  is_active: boolean;
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
  temporary_password?: string;
  profile: {
    id: string;
    matric_number: string;
    first_name: string;
    last_name: string;
    other_names: string;
    department: string;
    faculty: string;
    level: string;
    gender: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
  } | null;
  workstation: {
    id: string;
    station_name: string;
    station_code: string;
    assigned_role: string;
    is_active: boolean;
  } | null;
}

export interface AdminWorkstation {
  id: string;
  user_id: string;
  username: string;
  station_name: string;
  station_code: string;
  location: string;
  assigned_role: string;
  is_active: boolean;
  last_login_at: string | null;
  managed_by: string | null;
  managed_by_username: string | null;
  created_at: string;
  updated_at: string;
  temporary_password?: string;
}

export interface AdminOpsQueues {
  stages: Array<{
    stage: string;
    waiting: number;
    in_progress: number;
    oldest_waiting: Array<{
      entry_id: string;
      visit_id: string;
      visit_number: string;
      student_name: string;
      matric_number: string;
      priority: string;
      position: number;
      created_at: string;
    }>;
  }>;
}

export interface AdminEmergency {
  id: string;
  status: string;
  student: string;
  matric_number: string;
  description: string;
  dial_triggered: boolean;
  priority_override: boolean;
  assigned_workstation: string | null;
  assigned_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface AdminAppointment {
  id: string;
  title: string;
  department: string;
  scheduled_at: string;
  status: string;
  notes: string;
  student_name: string;
  matric_number: string;
  visit_number: string | null;
  created_by: string | null;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
}
