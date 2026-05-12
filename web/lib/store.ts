import { create } from "zustand";
import type { UserDTO, PatientDTO, DoctorProfileDTO } from "shared";

interface AuthState {
  user: UserDTO | null;
  patient: PatientDTO | null;
  doctor: DoctorProfileDTO | null;
  hydrated: boolean;
  setSession: (s: { user: UserDTO; patient?: PatientDTO; doctor?: DoctorProfileDTO }) => void;
  clearSession: () => void;
  setHydrated: (v: boolean) => void;
  patchPatient: (patch: Partial<PatientDTO>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  patient: null,
  doctor: null,
  hydrated: false,
  setSession: ({ user, patient, doctor }) =>
    set({ user, patient: patient ?? null, doctor: doctor ?? null }),
  clearSession: () => set({ user: null, patient: null, doctor: null }),
  setHydrated: (v) => set({ hydrated: v }),
  patchPatient: (patch) =>
    set((s) => ({ patient: s.patient ? { ...s.patient, ...patch } : s.patient })),
}));
