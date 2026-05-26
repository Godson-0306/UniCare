import axios from "axios";

import type { ApiErrorResponse } from "@/types/api";

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Cannot reach the UniCare server. Start the backend with: python manage.py runserver";
    }
    const data = error.response.data as ApiErrorResponse | { detail?: string };
    if (typeof data === "object" && data !== null) {
      if ("success" in data && data.success === false && "error" in data) {
        return data.error.message;
      }
      if ("detail" in data && typeof data.detail === "string") {
        return data.detail;
      }
      if ("error" in data && typeof (data as ApiErrorResponse).error?.message === "string") {
        return (data as ApiErrorResponse).error.message;
      }
    }
    if (error.response.status === 401) {
      return "Invalid user ID or password.";
    }
    if (error.response.status >= 500) {
      return "Server error during sign in. Ensure the backend is running (python manage.py runserver).";
    }
  }
  return fallback;
}
