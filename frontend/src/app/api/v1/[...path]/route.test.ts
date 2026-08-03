import { describe, expect, it } from "vitest";

import { HOSPITAL_PREFIXES } from "@/app/api/v1/[...path]/route";

describe("API proxy hospital prefixes", () => {
  it("includes all backend hospital-protected prefixes", () => {
    expect(HOSPITAL_PREFIXES).toEqual([
      "reception",
      "nurse",
      "doctor",
      "pharmacy",
      "lab",
      "emergency",
      "appointments",
      "audit",
    ]);
  });
});
