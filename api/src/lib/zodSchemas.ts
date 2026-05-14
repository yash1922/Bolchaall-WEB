import { z } from "zod";

export const SignupInput = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(80),
  role: z.enum(["patient", "doctor"]).default("patient"),
});
export type SignupInputT = z.infer<typeof SignupInput>;

export const LoginInput = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1).max(100),
});
export type LoginInputT = z.infer<typeof LoginInput>;

export const OnboardingInput = z.object({
  language: z.enum(["en", "hi"]),
  conditions: z.array(z.string().min(1).max(60)).max(10).default([]),
});
export type OnboardingInputT = z.infer<typeof OnboardingInput>;

export const DoctorApplyInput = z.object({
  fullName: z.string().min(2).max(120),
  phone: z.string().min(7).max(40),
  qualification: z.string().min(2).max(120),
  specialization: z.string().min(2).max(120),
  linkedinUrl: z.string().url().or(z.literal("")).optional().default(""),
  clinicName: z.string().max(160).optional().default(""),
  license: z.string().min(2).max(80),
  experienceYears: z.number().int().min(0).max(70),
  certifications: z.array(z.string().min(1).max(120)).max(20),
  bio: z.string().max(1000).default(""),
  // Pre-uploaded URLs from /api/upload/*
  govIdUrl: z.string().url().or(z.literal("")).optional().default(""),
  licenseDocUrl: z.string().url().or(z.literal("")).optional().default(""),
  certificationsUrls: z.array(z.string().url()).max(20).optional().default([]),
});
export type DoctorApplyInputT = z.infer<typeof DoctorApplyInput>;

export const AdminDecisionInput = z.object({
  decision: z.enum(["approve", "reject"]),
  remarks: z.string().max(800).optional().default(""),
});
export type AdminDecisionInputT = z.infer<typeof AdminDecisionInput>;

export const UploadBase64Input = z.object({
  filename: z.string().min(1).max(200),
  mime: z.string().min(3).max(80),
  // base64 string of file content (no data URL prefix)
  base64: z.string().min(1).max(4_000_000), // ~3MB raw base64 cap
});
export type UploadBase64InputT = z.infer<typeof UploadBase64Input>;

export const ScoreSubmitInput = z.object({
  exerciseId: z.string().min(1),
  assignmentId: z.string().min(1).optional(),
  score: z.number().min(0).max(100),
  selfRating: z.number().int().min(1).max(5).nullable().default(null),
  audioUrl: z.string().url().nullable().default(null),
  mfccVector: z.array(z.number()).max(64).optional(),
});
export type ScoreSubmitInputT = z.infer<typeof ScoreSubmitInput>;

export const AssignmentFeedbackInput = z.object({
  feedback: z.string().max(2000),
  manualScore: z.number().int().min(0).max(100).nullable().default(null),
});
export type AssignmentFeedbackInputT = z.infer<typeof AssignmentFeedbackInput>;

export const TherapistRatingInput = z.object({
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(600).optional().default(""),
});
export type TherapistRatingInputT = z.infer<typeof TherapistRatingInput>;

export const SendMessageInput = z.object({
  chatId: z.string().min(1),
  body: z.string().min(1).max(2000),
});
export type SendMessageInputT = z.infer<typeof SendMessageInput>;

export const AssignExerciseInput = z.object({
  patientId: z.string().min(1),
  exerciseId: z.string().min(1),
  dueAt: z.string().datetime().optional(),
});
export type AssignExerciseInputT = z.infer<typeof AssignExerciseInput>;
