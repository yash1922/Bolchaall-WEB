import { Schema, model, Types } from "mongoose";

const SessionSchema = new Schema(
  {
    patientId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    startedAt: { type: Date, default: () => new Date() },
    endedAt: { type: Date, default: null },
    durationSeconds: { type: Number, default: 0, min: 0 },
    scoresCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

SessionSchema.index({ patientId: 1, startedAt: -1 });

export const PracticeSession = model("PracticeSession", SessionSchema);
