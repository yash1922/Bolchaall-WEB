import { Schema, model, Types } from "mongoose";

const UploadedFileSchema = new Schema(
  {
    ownerId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    filename: { type: String, required: true, maxlength: 200 },
    mime: { type: String, required: true, maxlength: 80 },
    sizeBytes: { type: Number, required: true, min: 0 },
    // Base64-encoded file content (when CLOUDINARY_* not configured).
    // Cap enforced at the route layer (~3MB raw base64 ≈ 2MB binary).
    data: { type: String, required: true },
  },
  { timestamps: true }
);

export const UploadedFile = model("UploadedFile", UploadedFileSchema);
