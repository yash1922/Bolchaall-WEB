// Shared DTOs imported by api and web.

export type Role = "patient" | "doctor" | "admin";

export type SubscriptionStatus = "trial" | "active" | "past_due" | "canceled" | "none";

export type DoctorStatus = "unsubmitted" | "pending" | "approved" | "rejected";

export type ExerciseType = "perception" | "production";

export type Difficulty = "easy" | "medium" | "hard";

export type Language = "en" | "hi";

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: Role;
  suspended?: boolean;
  createdAt: string;
}

export interface PatientDTO {
  id: string;
  userId: string;
  language: Language;
  conditions: string[];
  xp: number;
  coins: number;
  streakDays: number;
  lastPracticedAt: string | null;
  unlockedBadges: string[];
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string | null;
  assignedDoctorId: string | null;
  onboardingComplete: boolean;
}

export interface DoctorProfileDTO {
  id: string;
  userId: string;
  license: string;
  certifications: string[];
  experienceYears: number;
  bio: string;
  status: DoctorStatus;
  rating: number;
  // Extended onboarding fields (may be empty until application is submitted)
  fullName?: string;
  phone?: string;
  qualification?: string;
  specialization?: string;
  linkedinUrl?: string;
  clinicName?: string;
  govIdUrl?: string | null;
  licenseDocUrl?: string | null;
  certificationsUrls?: string[];
  adminRemarks?: string;
  submittedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
}

export interface PhonemeWordDTO {
  id: string;
  ipa: string;
  label: string;
  language: Language;
  category: string;
  articulationTip: string;
  place: string;
  manner: string;
  voicing: boolean;
  tonguePosition: "front" | "mid" | "back";
  lipShape: "rounded" | "spread" | "neutral";
  sampleWords: string[];
}

export interface ExerciseItemDTO {
  prompt: string;
  targetWord: string;
  altWord?: string;
}

export type ExerciseTier = "beginner" | "intermediate" | "advanced";

export interface ExerciseDTO {
  id: string;
  title: string;
  description: string;
  targetPhonemes: string[];
  type: ExerciseType;
  difficulty: Difficulty;
  items: ExerciseItemDTO[];
  audioRefUrl: string | null;
  isGlobal: boolean;
  setName: string;
  setOrder: number;
  tier: ExerciseTier;
}

export interface AssignmentDTO {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName?: string;
  exerciseId: string;
  exerciseTitle: string;
  exerciseType?: string;
  exerciseDifficulty?: string;
  exerciseTargetPhonemes?: string[];
  dueAt: string | null;
  completedAt: string | null;
  reviewedAt?: string | null;
  therapistFeedback?: string;
  therapistManualScore?: number | null;
  note?: string;
  createdAt: string;
}

export interface ScoreDTO {
  id: string;
  patientId: string;
  exerciseId: string;
  score: number;
  selfRating: number | null;
  audioUrl: string | null;
  createdAt: string;
}

export interface AchievementDTO {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface ChatDTO {
  id: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  doctorName: string;
  unreadCount: number;
  lastMessageAt: string | null;
}

export interface MessageDTO {
  id: string;
  chatId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface AuthResponseDTO {
  user: UserDTO;
  patient?: PatientDTO;
  doctor?: DoctorProfileDTO;
  accessToken: string;
}

export interface AdminAnalyticsDTO {
  totalUsers: number;
  activePatients: number;
  trialPatients: number;
  paidPatients: number;
  approvedDoctors: number;
  pendingApplications: number;
  monthlyRevenueDemo: number;
}

export interface ApiOk<T> {
  ok: true;
  data: T;
}

export interface ApiErr {
  ok: false;
  error: { code: string; message: string };
}

export type ApiResponse<T> = ApiOk<T> | ApiErr;
