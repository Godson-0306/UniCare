import { create } from "zustand";
import { persist } from "zustand/middleware";

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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      workstation: null,
      profile: null,
      portal: null,
      isHydrated: false,
      setHydrated: (value) => set({ isHydrated: value }),
      setSession: (session, portal) =>
        set({
          user: session.user,
          tokens: session.tokens,
          workstation: session.workstation ?? null,
          profile: session.profile ?? null,
          portal,
        }),
      setTokens: (tokens) => set({ tokens }),
      setProfile: (profile) => set({ profile }),
      logout: () =>
        set({
          user: null,
          tokens: null,
          workstation: null,
          profile: null,
          portal: null,
        }),
    }),
    {
      name: "unicare-auth",
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
