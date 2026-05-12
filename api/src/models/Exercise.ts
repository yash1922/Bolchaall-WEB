import { Schema, model, Types } from "mongoose";

const ExerciseItemSchema = new Schema(
  {
    prompt: { type: String, required: true },
    targetWord: { type: String, required: true },
    altWord: { type: String, default: null },
  },
  { _id: false }
);

const ExerciseSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    targetPhonemes: { type: [String], default: [], index: true },
    type: { type: String, enum: ["perception", "production"], required: true, index: true },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy",
      index: true,
    },
    items: { type: [ExerciseItemSchema], default: [] },
    audioRefUrl: { type: String, default: null },
    isGlobal: { type: Boolean, default: true, index: true },
    createdById: { type: Types.ObjectId, ref: "User", default: null },
    setName: { type: String, default: "Warm-up", index: true },
    setOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Exercise = model("Exercise", ExerciseSchema);
