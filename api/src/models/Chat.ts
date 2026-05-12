import { Schema, model, Types } from "mongoose";

const ChatSchema = new Schema(
  {
    patientId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    doctorId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    lastMessageAt: { type: Date, default: null },
    unreadByPatient: { type: Number, default: 0 },
    unreadByDoctor: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ChatSchema.index({ patientId: 1, doctorId: 1 }, { unique: true });

export const Chat = model("Chat", ChatSchema);
