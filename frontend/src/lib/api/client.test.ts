import { describe, expect, it } from "vitest";

import { isHospitalPath } from "@/lib/api/client";

describe("isHospitalPath", () => {
  it("matches every hospital-protected API prefix", () => {
    expect(isHospitalPath("reception/students/search/")).toBe(true);
    expect(isHospitalPath("nurse/queue/")).toBe(true);
    expect(isHospitalPath("doctor/queue/")).toBe(true);
    expect(isHospitalPath("pharmacy/queue/")).toBe(true);
    expect(isHospitalPath("lab/queue/")).toBe(true);
    expect(isHospitalPath("emergency/events/")).toBe(true);
    expect(isHospitalPath("appointments/")).toBe(true);
    expect(isHospitalPath("audit/logs/")).toBe(true);
  });

  it("does not mark student or auth routes as hospital routes", () => {
    expect(isHospitalPath("student/notifications/")).toBe(false);
    expect(isHospitalPath("auth/login/")).toBe(false);
  });
});
