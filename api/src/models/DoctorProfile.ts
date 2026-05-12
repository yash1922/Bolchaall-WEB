import { Schema, model, Types } from "mongoose";

const DoctorProfileSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    license: { type: String, default: "" },
    certifications: { type: [String], default: [] },
    experienceYears: { type: Number, default: 0, min: 0 },
    bio: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    rating: { type: Number, default: 5, min: 0, max: 5 },
    credentialsUrl: { type: String, default: null },
  },
  { timestamps: true }
);

export const DoctorProfile = model("DoctorProfile", DoctorProfileSchema);
