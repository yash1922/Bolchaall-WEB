import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ["patient", "doctor", "admin"], required: true, index: true },
    suspended: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type UserDoc = HydratedDocument<InferSchemaType<typeof UserSchema>>;
export const User = model("User", UserSchema);
