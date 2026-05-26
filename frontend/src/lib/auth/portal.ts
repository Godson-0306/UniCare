import type { AccountType, PortalType, UserRole } from "@/types/auth";

export function portalForAccount(accountType: AccountType): PortalType {
  return accountType === "student" ? "student" : "hospital";
}

export function isHospitalRole(role: UserRole): boolean {
  return role !== "student";
}
