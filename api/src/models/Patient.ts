import { Schema, model, Types } from "mongoose";

const PatientSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    language: { type: String, enum: ["en", "hi"], default: "en" },
    conditions: { type: [String], default: [] },
    xp: { type: Number, default: 0, min: 0 },
    coins: { type: Number, default: 0, min: 0 },
    streakDays: { type: Number, default: 0, min: 0 },
    lastPracticedAt: { type: Date, default: null },
    unlockedBadges: { type: [String], default: [] },
    subscriptionStatus: {
      type: String,
      enum: ["trial", "active", "past_due", "canceled", "none"],
      default: "trial",
    },
    trialEndsAt: { type: Date, default: null },
    stripeCustomerId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null },
    assignedDoctorId: { type: Types.ObjectId, ref: "User", default: null, index: true },
    onboardingComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Patient = model("Patient", PatientSchema);
