import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { apiUrl } from "@/lib/api/base-url";
import type { AuthSession, AuthTokens, AuthUser, PortalType, StudentProfile, WorkstationInfo } from "@/types/auth";

interface AuthState {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  workstation: WorkstationInfo | null;
  profile: StudentProfile | null;
  portal: PortalType;
  isHydrated: boolean;
  setHydrated: (value: boolean) => void;
  setSession: (session: AuthSession, portal: PortalType) => void;
  setTokens: (tokens: AuthTokens) => void;
  setProfile: (profile: StudentProfile) => void;
  logout: () => void;
}

const SESSION_COOKIE = "unicare-session";

function setSessionCookie(portal: PortalType, role?: string) {
  if (typeof document === "undefined" || !portal || !role) return;
  document.cookie = `${SESSION_COOKIE}=authenticated; path=/; max-age=604800; SameSite=Lax`;
}

function clearSessionCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

function revokeRefreshToken(refresh?: string) {
  if (!refresh || typeof window === "undefined") return;
  void fetch(apiUrl("auth", "logout"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
    keepalive: true,
  }).catch(() => undefined);
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      workstation: null,
      profile: null,
      portal: null,
      isHydrated: false,
      setHydrated: (value) => set({ isHydrated: value }),
      setSession: (session, portal) =>
        {
          setSessionCookie(portal, session.user.role);
          set({
            user: session.user,
            tokens: session.tokens,
            workstation: session.workstation ?? null,
            profile: session.profile ?? null,
            portal,
          });
        },
      setTokens: (tokens) => set({ tokens }),
      setProfile: (profile) => set({ profile }),
      logout: () => {
        revokeRefreshToken(get().tokens?.refresh);
        clearSessionCookie();
        set({
          user: null,
          tokens: null,
          workstation: null,
          profile: null,
          portal: null,
        });
      },
    }),
    {
      name: "unicare-auth",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        workstation: state.workstation,
        profile: state.profile,
        portal: state.portal,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
