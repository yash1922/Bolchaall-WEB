import { Schema, model, Types } from "mongoose";

const ScoreSchema = new Schema(
  {
    patientId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    exerciseId: { type: Types.ObjectId, ref: "Exercise", required: true, index: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    selfRating: { type: Number, min: 1, max: 5, default: null },
    audioUrl: { type: String, default: null },
    mfccVector: { type: [Number], default: undefined },
  },
  { timestamps: true }
);

ScoreSchema.index({ patientId: 1, createdAt: -1 });

export const Score = model("Score", ScoreSchema);
