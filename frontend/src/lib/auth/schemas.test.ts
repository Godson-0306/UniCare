import { describe, expect, it } from "vitest";

import { loginSchema, studentRegistrationSchema } from "@/lib/auth/schemas";

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({ identifier: "U2024001", password: "student123" });
    expect(result.success).toBe(true);
  });

  it("rejects empty credentials", () => {
    const result = loginSchema.safeParse({ identifier: "", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("studentRegistrationSchema", () => {
  it("requires core student fields", () => {
    const result = studentRegistrationSchema.safeParse({
      first_name: "Ada",
      last_name: "Okafor",
      matric_number: "U2024010",
      password: "student123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short passwords", () => {
    const result = studentRegistrationSchema.safeParse({
      first_name: "Ada",
      last_name: "Okafor",
      matric_number: "U2024010",
      password: "short",
    });
    expect(result.success).toBe(false);
  });
});
