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
  signup: (body: { email: string; password: string; name: string; role: "patient" | "doctor"; age?: number; phone?: string }) =>
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
  submitActivityScore: (body: {
    activity: "phoneme_blending" | "phoneme_deleting";
    correct: number;
    total: number;
    notes?: string;
  }) =>
    request<{
      accuracy: number;
      xpGained: number;
      coinsGained: number;
      totalXp: number;
      totalCoins: number;
      streakDays: number;
    }>("/api/patient/activity-score", { method: "POST", body }),
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
  patientAvailableTherapists: () =>
    request<
      Array<{
        userId: string;
        name: string;
        email: string;
        specialization: string;
        qualification: string;
        experienceYears: number;
        rating: number | null;
        rosterCount: number;
        isCurrent: boolean;
      }>
    >("/api/patient/available-therapists"),
  patientSelectTherapist: (doctorUserId: string) =>
    request<{ doctor: { id: string; name: string; email: string } | null }>(
      "/api/patient/therapist/select",
      { method: "POST", body: { doctorUserId } }
    ),
  patientAutoMatch: () =>
    request<{ doctor: { id: string; name: string; email: string } | null }>(
      "/api/patient/auto-match",
      { method: "POST" }
    ),
  patientRateTherapist: (body: { stars: number; comment?: string }) =>
    request<{
      stars: number;
      comment: string;
      averageRating: number;
      ratingCount: number;
    }>("/api/patient/therapist/rate", { method: "POST", body }),
  patientGetTherapistRating: () =>
    request<{
      stars: number | null;
      comment: string;
      averageRating: number | null;
      ratingCount: number;
    }>("/api/patient/therapist/rating"),

  // ---- uploads ----
  uploadBase64: (body: { filename: string; mime: string; base64: string }) =>
    request<{ url: string; id: string; sizeBytes: number }>("/api/upload/base64", {
      method: "POST",
      body,
    }),

  // ---- doctor ----
  doctorProfile: () =>
    request<import("shared").DoctorProfileDTO>("/api/doctor/profile"),
  doctorApply: (body: {
    fullName: string;
    phone: string;
    qualification: string;
    specialization: string;
    linkedinUrl: string;
    clinicName: string;
    license: string;
    experienceYears: number;
    certifications: string[];
    bio: string;
    govIdUrl: string;
    licenseDocUrl: string;
    certificationsUrls: string[];
  }) =>
    request<{ status: string; submittedAt: string }>("/api/doctor/apply", {
      method: "POST",
      body,
    }),
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
        age: number | null;
        phone: string;
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
        age: number | null;
        phone: string;
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
        type: "perception" | "production";
        difficulty: "easy" | "medium" | "hard";
        items: Array<{ prompt: string; targetWord: string; altWord?: string | null }>;
        setName: string;
        setOrder: number;
        tier: "beginner" | "intermediate" | "advanced";
        isGlobal: boolean;
        isMine: boolean;
      }>
    >("/api/doctor/exercises"),
  doctorCreateExercise: (body: {
    title: string;
    description: string;
    targetPhonemes: string[];
    type: "perception" | "production";
    difficulty: "easy" | "medium" | "hard";
    items: Array<{ prompt: string; targetWord: string; altWord?: string | null }>;
  }) => request<{ id: string }>("/api/doctor/exercises", { method: "POST", body }),
  doctorDeleteExercise: (id: string) =>
    request<{ deleted: true }>(`/api/doctor/exercises/${id}`, { method: "DELETE" }),
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
  doctorListAssignments: (filter: "all" | "pending_review" | "reviewed" | "open" = "all") =>
    request<
      Array<{
        id: string;
        patientId: string;
        patientName: string;
        patientEmail: string;
        exerciseId: string;
        exerciseTitle: string;
        exerciseType: string;
        exerciseDifficulty: string;
        exerciseTargetPhonemes: string[];
        dueAt: string | null;
        completedAt: string | null;
        reviewedAt: string | null;
        therapistFeedback: string;
        therapistManualScore: number | null;
        note: string;
        createdAt: string;
      }>
    >(`/api/doctor/assignments?filter=${filter}`),
  doctorAssignmentDetail: (id: string) =>
    request<{
      id: string;
      patient: { id: string; name: string; email: string };
      exercise: {
        id: string;
        title: string;
        type: string;
        difficulty: string;
        targetPhonemes: string[];
        items: Array<{ prompt: string; targetWord: string; altWord?: string | null }>;
      };
      dueAt: string | null;
      completedAt: string | null;
      reviewedAt: string | null;
      therapistFeedback: string;
      therapistManualScore: number | null;
      note: string;
      scores: Array<{
        id: string;
        score: number;
        selfRating: number | null;
        audioUrl: string | null;
        createdAt: string;
      }>;
    }>(`/api/doctor/assignments/${id}`),
  doctorSubmitFeedback: (id: string, body: { feedback: string; manualScore: number | null }) =>
    request<{
      id: string;
      therapistFeedback: string;
      therapistManualScore: number | null;
      reviewedAt: string | null;
    }>(`/api/doctor/assignments/${id}/feedback`, { method: "POST", body }),

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
        fullName: string;
        phone: string;
        qualification: string;
        specialization: string;
        linkedinUrl: string;
        clinicName: string;
        license: string;
        experienceYears: number;
        certifications: string[];
        bio: string;
        govIdUrl: string | null;
        licenseDocUrl: string | null;
        certificationsUrls: string[];
        credentialsUrl: string | null;
        appliedAt: string;
      }>
    >("/api/admin/applications"),
  adminDecide: (id: string, decision: "approve" | "reject", remarks = "") =>
    request<{ status: string }>(`/api/admin/applications/${id}/decision`, {
      method: "POST",
      body: { decision, remarks },
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
        // Patient-only
        age: number | null;
        phone: string;
        streakDays: number | null;
        xp: number | null;
        subscriptionStatus: string | null;
        // Doctor-only
        specialization: string;
        doctorStatus: string | null;
        rating: number | null;
      }>
    >("/api/admin/users"),
  adminUserDetail: (id: string) =>
    request<{
      id: string;
      email: string;
      name: string;
      role: string;
      suspended: boolean;
      createdAt: string;
      patient: null | {
        age: number | null;
        phone: string;
        language: string;
        conditions: string[];
        xp: number;
        coins: number;
        streakDays: number;
        unlockedBadges: string[];
        subscriptionStatus: string;
        trialEndsAt: string | null;
        assignedDoctorId: string | null;
        lastPracticedAt: string | null;
        onboardingComplete: boolean;
      };
      doctor: null | {
        fullName: string;
        phone: string;
        specialization: string;
        qualification: string;
        license: string;
        experienceYears: number;
        bio: string;
        status: string;
        rating: number | null;
        clinicName: string;
        linkedinUrl: string;
        submittedAt: string | null;
        approvedAt: string | null;
        rejectedAt: string | null;
      };
      activity: { scoreCount: number; assignmentCount: number; chatCount: number };
    }>(`/api/admin/users/${id}`),
  adminSuspend: (id: string, suspend: boolean) =>
    request<{ suspended: boolean }>(`/api/admin/users/${id}/suspend`, {
      method: "POST",
      body: { suspend },
    }),
  adminDeleteUser: (id: string) =>
    request<{ deleted: true; role: string; name: string }>(`/api/admin/users/${id}`, {
      method: "DELETE",
    }),
  adminAssignments: () =>
    request<{
      patients: Array<{
        userId: string;
        name: string;
        email: string;
        subscriptionStatus: string;
        assignedDoctorId: string | null;
        conditions: string[];
      }>;
      doctors: Array<{
        userId: string;
        name: string;
        email: string;
        specialization: string;
        rating: number;
        rosterCount: number;
      }>;
    }>("/api/admin/assignments"),
  adminAssignPatient: (patientUserId: string, doctorUserId: string | null) =>
    request<{ patientUserId: string; assignedDoctorId: string | null }>(
      "/api/admin/assignments",
      { method: "POST", body: { patientUserId, doctorUserId } }
    ),
  adminListChats: () =>
    request<
      Array<{
        id: string;
        patientId: string;
        doctorId: string;
        patientName: string;
        doctorName: string;
        lastMessageAt: string | null;
        unreadByPatient: number;
        unreadByDoctor: number;
      }>
    >("/api/admin/chats"),
  adminChatMessages: (chatId: string) =>
    request<
      Array<{
        id: string;
        senderId: string;
        senderName: string;
        senderRole: string;
        body: string;
        createdAt: string;
        readAt: string | null;
      }>
    >(`/api/admin/chats/${chatId}/messages`),
  adminDeleteMessage: (messageId: string) =>
    request<{ deleted: true }>(`/api/admin/chats/messages/${messageId}`, { method: "DELETE" }),

  // ---- chat ----
  listChats: () => request<import("shared").ChatDTO[]>("/api/chat/"),
  listMessages: (chatId: string) =>
    request<import("shared").MessageDTO[]>(`/api/chat/${chatId}/messages`),
  sendMessage: (body: { chatId: string; body: string }) =>
    request<import("shared").MessageDTO>("/api/chat/messages", { method: "POST", body }),
  markChatRead: (chatId: string) =>
    request<{ ok: true }>(`/api/chat/${chatId}/read`, { method: "POST" }),
};
