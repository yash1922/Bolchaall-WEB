import { Schema, model, Types } from "mongoose";

const AssignmentSchema = new Schema(
  {
    patientId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    doctorId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    exerciseId: { type: Types.ObjectId, ref: "Exercise", required: true, index: true },
    dueAt: { type: Date, default: null },
    completedAt: { type: Date, default: null, index: true },
    note: { type: String, default: "" },

    // Therapist review of the patient's submission
    therapistFeedback: { type: String, default: "" },
    therapistManualScore: { type: Number, default: null, min: 0, max: 100 },
    reviewedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

AssignmentSchema.index({ patientId: 1, completedAt: 1 });
AssignmentSchema.index({ doctorId: 1, completedAt: 1, reviewedAt: 1 });

export const Assignment = model("Assignment", AssignmentSchema);
