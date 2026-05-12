import { Schema, model, Types } from "mongoose";

const MessageSchema = new Schema(
  {
    chatId: { type: Types.ObjectId, ref: "Chat", required: true, index: true },
    senderId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    body: { type: String, required: true, maxlength: 2000 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

MessageSchema.index({ chatId: 1, createdAt: -1 });

export const Message = model("Message", MessageSchema);
