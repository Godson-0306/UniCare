import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { apiUrl, getApiBaseUrl } from "@/lib/api/base-url";
import { useAuthStore } from "@/stores/auth-store";

const HOSPITAL_TOKEN =
  process.env.NEXT_PUBLIC_HOSPITAL_ACCESS_TOKEN ?? "change-hospital-access-secret";

export const apiClient = axios.create({
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const path = (config.url ?? "").replace(/^\/+/, "");
  config.url = apiUrl(path);
  config.baseURL = undefined;

  const { tokens, portal } = useAuthStore.getState();
  if (tokens?.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`;
  }
  if (portal === "hospital" && path && isHospitalPath(path)) {
    config.headers["X-Hospital-Access-Token"] = HOSPITAL_TOKEN;
  }
  return config;
});

const HOSPITAL_PREFIXES = ["reception/", "nurse/", "doctor/", "pharmacy/", "lab/", "audit/", "emergency/"];

function isHospitalPath(path: string) {
  return HOSPITAL_PREFIXES.some((prefix) => path.startsWith(prefix));
}

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status !== 401 || !original || original._retry) {
      return Promise.reject(error);
    }

    const { tokens, setTokens, logout } = useAuthStore.getState();
    if (!tokens?.refresh) {
      logout();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve) => {
        refreshQueue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(original));
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(apiUrl("auth", "token", "refresh"), {
        refresh: tokens.refresh,
      });
      const newAccess = data.access ?? data.data?.access;
      const newRefresh = data.refresh ?? data.data?.refresh ?? tokens.refresh;
      setTokens({ access: newAccess, refresh: newRefresh });
      refreshQueue.forEach((cb) => cb(newAccess));
      refreshQueue = [];
      original.headers.Authorization = `Bearer ${newAccess}`;
      return apiClient(original);
    } catch (refreshError) {
      logout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export { getApiBaseUrl, apiUrl };
