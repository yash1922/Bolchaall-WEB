import { Schema, model } from "mongoose";

const AchievementSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    icon: { type: String, default: "trophy" },
    criteria: {
      type: {
        type: String,
        enum: ["first_score", "streak_days", "score_threshold_count", "phoneme_mastery"],
        required: true,
      },
      threshold: { type: Number, default: 0 },
      phoneme: { type: String, default: null },
    },
  },
  { timestamps: true }
);

export const Achievement = model("Achievement", AchievementSchema);
