import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/base-url", () => ({
  apiUrl: (...parts: string[]) => `/api/v1/${parts.join("/")}`,
}));

describe("useAuthStore", () => {
  beforeEach(() => {
    vi.resetModules();
    document.cookie = "unicare-session=; path=/; max-age=0; SameSite=Lax";
  });

  it("sets and clears the session cookie", async () => {
    const { useAuthStore } = await import("@/stores/auth-store");

    useAuthStore.getState().setSession(
      {
        user: {
          id: "1",
          username: "U2024001",
          role: "student",
          account_type: "student",
        },
        tokens: { access: "access-token", refresh: "refresh-token" },
      },
      "student",
    );

    expect(document.cookie).toContain("unicare-session=");
    expect(document.cookie).toContain("authenticated");
    expect(useAuthStore.getState().portal).toBe("student");

    useAuthStore.getState().logout();
    expect(useAuthStore.getState().tokens).toBeNull();
    expect(document.cookie).not.toMatch(/unicare-session=[^;]+/);
  });
});
