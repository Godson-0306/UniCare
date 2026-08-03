import type { ApiResponse } from "@/types/api";
import type { AuthSession, AuthTokens, AuthUser, StudentProfile, WorkstationInfo } from "@/types/auth";

import { apiUrl } from "./base-url";

interface LoginPayload {
  access: string;
  refresh: string;
  user: AuthUser;
  workstation?: WorkstationInfo;
  profile?: StudentProfile;
}

export async function login(identifier: string, password: string): Promise<ApiResponse<LoginPayload>> {
  const response = await fetch(apiUrl("auth", "login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
    cache: "no-store",
  });

  const data = (await response.json()) as ApiResponse<LoginPayload>;
  if (!response.ok && "success" in data && !data.success) {
    return data;
  }
  if (!response.ok) {
    return {
      success: false,
      error: { message: "Sign in failed. Check your user ID and password." },
    };
  }
  return data;
}

export function toAuthSession(payload: LoginPayload): AuthSession {
  return {
    user: payload.user,
    tokens: { access: payload.access, refresh: payload.refresh },
    workstation: payload.workstation,
    profile: payload.profile,
  };
}

export type { AuthTokens };
