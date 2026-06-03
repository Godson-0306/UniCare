import axios from "axios";

import type { ApiErrorResponse } from "@/types/api";

interface ApiErrorMessageOptions {
  authOperation?: boolean;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
  options: ApiErrorMessageOptions = {}
): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return `${fallback} Cannot reach the UniCare server.`;
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
      return options.authOperation ? "Invalid user ID or password." : "Authentication session expired. Please sign in again.";
    }
    if (error.response.status === 403) {
      return "You do not have permission to perform this action.";
    }
    if (error.response.status >= 500) {
      return fallback;
    }
  }
  return fallback;
}
