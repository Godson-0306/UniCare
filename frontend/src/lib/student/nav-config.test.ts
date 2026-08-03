import { describe, expect, it } from "vitest";

import { STUDENT_NAV } from "./nav-config";

describe("STUDENT_NAV", () => {
  it("includes the linked contact route", () => {
    expect(STUDENT_NAV).toContainEqual({ label: "Contact", href: "/student/contact" });
  });
});
