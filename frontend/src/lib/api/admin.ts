import { apiClient } from "@/lib/api/client";
import type {
  AdminAnalytics,
  AdminAppointment,
  AdminEmergency,
  AdminOpsQueues,
  AdminOverview,
  AdminPaginated,
  AdminAuditLog,
  AdminUser,
  AdminWorkstation,
} from "@/types/admin";

type Query = Record<string, string | number | undefined | null>;

function toQuery(params: Query = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const suffix = search.toString();
  return suffix ? `?${suffix}` : "";
}

async function getData<T>(path: string): Promise<T> {
  const { data } = await apiClient.get(path);
  if (!data.success) {
    throw new Error(data.error?.message || "Request failed");
  }
  return data.data as T;
}

async function mutateData<T>(method: "post" | "patch" | "delete", path: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.request({ method, url: path, data: body });
  if (!data.success) {
    throw new Error(data.error?.message || "Request failed");
  }
  return (data.data ?? data) as T;
}

export const adminApi = {
  overview: () => getData<AdminOverview>("/admin/overview/"),
  analytics: (days = 14) => getData<AdminAnalytics>(`/admin/analytics/${toQuery({ days })}`),
  auditLogs: (params: Query = {}) => getData<AdminPaginated<AdminAuditLog>>(`/admin/audit-logs/${toQuery(params)}`),
  auditExportUrl: (params: Query = {}) => `/api/v1/admin/audit-logs/export/${toQuery(params)}`,
  users: (params: Query = {}) => getData<AdminPaginated<AdminUser>>(`/admin/users/${toQuery(params)}`),
  createUser: (payload: Record<string, unknown>) => mutateData<AdminUser>("post", "/admin/users/", payload),
  updateUser: (id: string, payload: Record<string, unknown>) =>
    mutateData<AdminUser>("patch", `/admin/users/${id}/`, payload),
  deleteUser: (id: string, hard = false) =>
    mutateData<{ success?: boolean }>("delete", `/admin/users/${id}/${toQuery({ hard: hard ? "true" : undefined })}`),
  resetUserPassword: (id: string) =>
    mutateData<{ temporary_password: string }>("post", `/admin/users/${id}/reset-password/`, {}),
  workstations: (params: Query = {}) =>
    getData<AdminPaginated<AdminWorkstation>>(`/admin/workstations/${toQuery(params)}`),
  createWorkstation: (payload: Record<string, unknown>) =>
    mutateData<AdminWorkstation>("post", "/admin/workstations/", payload),
  updateWorkstation: (id: string, payload: Record<string, unknown>) =>
    mutateData<AdminWorkstation>("patch", `/admin/workstations/${id}/`, payload),
  deleteWorkstation: (id: string, hard = false) =>
    mutateData<{ success?: boolean }>(
      "delete",
      `/admin/workstations/${id}/${toQuery({ hard: hard ? "true" : undefined })}`,
    ),
  resetWorkstationPassword: (id: string) =>
    mutateData<{ temporary_password: string }>("post", `/admin/workstations/${id}/reset-password/`, {}),
  opsQueues: () => getData<AdminOpsQueues>("/admin/ops/queues/"),
  emergencies: (params: Query = {}) =>
    getData<AdminPaginated<AdminEmergency>>(`/admin/emergencies/${toQuery(params)}`),
  appointments: (params: Query = {}) =>
    getData<AdminPaginated<AdminAppointment>>(`/admin/appointments/${toQuery(params)}`),
  resolveEmergency: (id: string) => mutateData<{ success?: boolean }>("post", `/emergency/events/${id}/resolve/`, {}),
};
