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
    // Identity (collected at onboarding)
    fullName: { type: String, default: "" },
    phone: { type: String, default: "" },
    qualification: { type: String, default: "" }, // e.g. "MASLP", "MS in SLP"
    specialization: { type: String, default: "" }, // e.g. "Pediatric articulation"
    linkedinUrl: { type: String, default: "" },
    clinicName: { type: String, default: "" },

    // Professional credentials
    license: { type: String, default: "" },
    certifications: { type: [String], default: [] },
    experienceYears: { type: Number, default: 0, min: 0 },
    bio: { type: String, default: "" },

    // Approval flow
    status: {
      type: String,
      enum: ["unsubmitted", "pending", "approved", "rejected"],
      default: "unsubmitted",
      index: true,
    },
    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    adminRemarks: { type: String, default: "" },
    rating: { type: Number, default: 5, min: 0, max: 5 },

    // Document URLs (Cloudinary if configured, else our /api/upload/file/:id)
    govIdUrl: { type: String, default: null },
    licenseDocUrl: { type: String, default: null },
    certificationsUrls: { type: [String], default: [] },
    // Legacy single-credential URL (kept for back-compat)
    credentialsUrl: { type: String, default: null },
  },
  { timestamps: true }
);

export const DoctorProfile = model("DoctorProfile", DoctorProfileSchema);
