import { Schema, model, Types } from "mongoose";

/**
 * Patient → therapist rating. One row per (patient, therapist) — patient can update
 * their own rating any time. Aggregated mean is rolled up onto DoctorProfile.rating.
 */
const TherapistRatingSchema = new Schema(
  {
    patientId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    doctorId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    stars: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "", maxlength: 600 },
  },
  { timestamps: true }
);

TherapistRatingSchema.index({ patientId: 1, doctorId: 1 }, { unique: true });

export const TherapistRating = model("TherapistRating", TherapistRatingSchema);
