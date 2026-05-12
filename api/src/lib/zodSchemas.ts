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
  license: z.string().min(2).max(60),
  experienceYears: z.number().int().min(0).max(70),
  certifications: z.array(z.string().min(1).max(120)).max(10),
  bio: z.string().max(800).default(""),
});
export type DoctorApplyInputT = z.infer<typeof DoctorApplyInput>;

export const ScoreSubmitInput = z.object({
  exerciseId: z.string().min(1),
  score: z.number().min(0).max(100),
  selfRating: z.number().int().min(1).max(5).nullable().default(null),
  audioUrl: z.string().url().nullable().default(null),
  mfccVector: z.array(z.number()).max(64).optional(),
});
export type ScoreSubmitInputT = z.infer<typeof ScoreSubmitInput>;

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
