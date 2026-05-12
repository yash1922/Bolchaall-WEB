import { Schema, model } from "mongoose";

const PhonemeWordSchema = new Schema(
  {
    ipa: { type: String, required: true, index: true },
    label: { type: String, required: true },
    language: { type: String, enum: ["en", "hi"], required: true, index: true },
    category: { type: String, required: true, index: true },
    articulationTip: { type: String, default: "" },
    place: { type: String, default: "" },
    manner: { type: String, default: "" },
    voicing: { type: Boolean, default: false },
    tonguePosition: {
      type: String,
      enum: ["front", "mid", "back"],
      default: "mid",
    },
    lipShape: {
      type: String,
      enum: ["rounded", "spread", "neutral"],
      default: "neutral",
    },
    sampleWords: { type: [String], default: [] },
  },
  { timestamps: true }
);

PhonemeWordSchema.index({ language: 1, category: 1 });

export const PhonemeWord = model("PhonemeWord", PhonemeWordSchema);
