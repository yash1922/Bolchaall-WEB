import type { ApiResponse } from "shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

let accessToken: string | null = null;
let onAuthLost: (() => void) | null = null;

export function setAccessToken(t: string | null) {
  accessToken = t;
}

export function getAccessToken() {
  return accessToken;
}

export function setOnAuthLost(cb: (() => void) | null) {
  onAuthLost = cb;
}

interface FetchOpts {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  retried?: boolean;
}

async function request<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers ?? {}),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: opts.credentials ?? "include",
  });

  // Try to refresh once on 401
  if (res.status === 401 && !opts.retried && path !== "/api/auth/refresh") {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, { ...opts, retried: true });
    }
    if (onAuthLost) onAuthLost();
  }

  let json: ApiResponse<T> | null = null;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError(res.status, "PARSE_ERROR", "Server returned non-JSON response");
  }

  if (!json.ok) {
    throw new ApiError(res.status, json.error.code, json.error.message);
  }
  return json.data;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const json = (await res.json()) as ApiResponse<{ accessToken: string }>;
    if (json.ok) {
      accessToken = json.data.accessToken;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const api = {
  // ---- auth ----
  signup: (body: { email: string; password: string; name: string; role: "patient" | "doctor" }) =>
    request<{ user: import("shared").UserDTO; accessToken: string }>("/api/auth/signup", {
      method: "POST",
      body,
    }),
  login: (body: { email: string; password: string }) =>
    request<{ user: import("shared").UserDTO; accessToken: string }>("/api/auth/login", {
      method: "POST",
      body,
    }),
  logout: () => request<{ loggedOut: true }>("/api/auth/logout", { method: "POST" }),
  me: () =>
    request<{
      user: import("shared").UserDTO;
      patient?: import("shared").PatientDTO;
      doctor?: import("shared").DoctorProfileDTO;
    }>("/api/me/"),

  // ---- onboarding ----
  completeOnboarding: (body: { language: "en" | "hi"; conditions: string[] }) =>
    request<{ onboardingComplete: true }>("/api/onboarding/complete", { method: "POST", body }),

  // ---- patient ----
  patientDashboard: () =>
    request<{
      patient: import("shared").PatientDTO;
      recentScores: import("shared").ScoreDTO[];
      openAssignmentsCount: number;
      assignedDoctor: { id: string; name: string; email: string } | null;
      achievements: Array<{
        id: string;
        name: string;
        description: string;
        icon: string;
        unlocked: boolean;
      }>;
    }>("/api/patient/dashboard"),
  patientAssignments: (open?: boolean) =>
    request<import("shared").AssignmentDTO[]>(
      `/api/patient/assignments${open ? "?open=true" : ""}`
    ),
  patientScores: () => request<import("shared").ScoreDTO[]>("/api/patient/scores"),
  submitScore: (body: {
    exerciseId: string;
    score: number;
    selfRating?: number | null;
    audioUrl?: string | null;
    mfccVector?: number[];
    assignmentId?: string;
  }) =>
    request<{
      score: import("shared").ScoreDTO;
      xpGained: number;
      coinsGained: number;
      newlyUnlockedBadges: string[];
      totalXp: number;
      totalCoins: number;
      streakDays: number;
    }>("/api/patient/scores", { method: "POST", body }),
  listPhonemes: (language?: "en" | "hi") =>
    request<import("shared").PhonemeWordDTO[]>(
      `/api/patient/phonemes${language ? `?language=${language}` : ""}`
    ),
  getPhoneme: (id: string) =>
    request<import("shared").PhonemeWordDTO>(`/api/patient/phonemes/${id}`),
  listExercises: () => request<import("shared").ExerciseDTO[]>("/api/patient/exercises"),
  getExercise: (id: string) =>
    request<import("shared").ExerciseDTO>(`/api/patient/exercises/${id}`),
  upgradeDemo: () =>
    request<{
      subscriptionStatus: import("shared").SubscriptionStatus;
      trialEndsAt: string | null;
    }>("/api/patient/upgrade-demo", { method: "POST" }),
  patientAutoMatch: () =>
    request<{ doctor: { id: string; name: string; email: string } | null }>(
      "/api/patient/auto-match",
      { method: "POST" }
    ),

  // ---- doctor ----
  doctorApply: (body: {
    license: string;
    experienceYears: number;
    certifications: string[];
    bio: string;
  }) => request<{ status: string }>("/api/doctor/apply", { method: "POST", body }),
  doctorDashboard: () =>
    request<{
      doctor: { id: string; status: string; rating: number; experienceYears: number };
      patientsCount: number;
      assignmentsOpen: number;
      avgRecentScore: number | null;
    }>("/api/doctor/dashboard"),
  doctorPatients: () =>
    request<
      Array<{
        id: string;
        userId: string;
        name: string;
        email: string;
        xp: number;
        coins: number;
        streakDays: number;
        subscriptionStatus: string;
        conditions: string[];
      }>
    >("/api/doctor/patients"),
  doctorPatient: (patientUserId: string) =>
    request<{
      patient: {
        id: string;
        userId: string;
        name: string;
        email: string;
        xp: number;
        coins: number;
        streakDays: number;
        conditions: string[];
        subscriptionStatus: string;
      };
      recentScores: Array<{ id: string; exerciseId: string; score: number; createdAt: string }>;
      assignments: Array<{
        id: string;
        exerciseId: string;
        exerciseTitle: string;
        dueAt: string | null;
        completedAt: string | null;
        createdAt: string;
      }>;
    }>(`/api/doctor/patients/${patientUserId}`),
  doctorAssign: (body: { patientId: string; exerciseId: string; dueAt?: string }) =>
    request<import("shared").AssignmentDTO>("/api/doctor/assignments", { method: "POST", body }),
  doctorExercises: () =>
    request<
      Array<{
        id: string;
        title: string;
        description: string;
        targetPhonemes: string[];
        type: string;
        difficulty: string;
      }>
    >("/api/doctor/exercises"),
  doctorAvailablePatients: () =>
    request<
      Array<{
        patientId: string;
        userId: string;
        name: string;
        email: string;
        conditions: string[];
      }>
    >("/api/doctor/available-patients"),
  doctorClaim: (patientUserId: string) =>
    request<{ claimed: true }>(`/api/doctor/claim/${patientUserId}`, { method: "POST" }),

  // ---- admin ----
  adminAnalytics: () =>
    request<import("shared").AdminAnalyticsDTO>("/api/admin/analytics"),
  adminApplications: () =>
    request<
      Array<{
        id: string;
        userId: string;
        name: string;
        email: string;
        license: string;
        experienceYears: number;
        certifications: string[];
        bio: string;
        credentialsUrl: string | null;
        appliedAt: string;
      }>
    >("/api/admin/applications"),
  adminDecide: (id: string, decision: "approve" | "reject") =>
    request<{ status: string }>(`/api/admin/applications/${id}/decision`, {
      method: "POST",
      body: { decision },
    }),
  adminUsers: () =>
    request<
      Array<{
        id: string;
        email: string;
        name: string;
        role: string;
        suspended: boolean;
        createdAt: string;
      }>
    >("/api/admin/users"),
  adminSuspend: (id: string, suspend: boolean) =>
    request<{ suspended: boolean }>(`/api/admin/users/${id}/suspend`, {
      method: "POST",
      body: { suspend },
    }),

  // ---- chat ----
  listChats: () => request<import("shared").ChatDTO[]>("/api/chat/"),
  listMessages: (chatId: string) =>
    request<import("shared").MessageDTO[]>(`/api/chat/${chatId}/messages`),
  sendMessage: (body: { chatId: string; body: string }) =>
    request<import("shared").MessageDTO>("/api/chat/messages", { method: "POST", body }),
  markChatRead: (chatId: string) =>
    request<{ ok: true }>(`/api/chat/${chatId}/read`, { method: "POST" }),
};
