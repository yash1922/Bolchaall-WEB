import { Router } from "express";
import { Types } from "mongoose";
import { asyncHandler } from "../lib/asyncHandler";
import { Errors } from "../lib/errors";
import { requireAuth } from "../auth/middleware";
import { UploadBase64Input } from "../lib/zodSchemas";
import { UploadedFile } from "../models/UploadedFile";

export const uploadRouter = Router();

const MAX_BINARY_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

/**
 * Base64 fallback upload — stores small docs (license/certs/govID) directly in Mongo.
 * Returns a public-ish URL (`/api/upload/file/:id`) the caller stores in their profile.
 *
 * If CLOUDINARY_* env vars are configured later, swap this for signed direct upload
 * (the URLs returned are interchangeable from the form's perspective).
 */
uploadRouter.post(
  "/base64",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = UploadBase64Input.parse(req.body);

    if (!ALLOWED_MIMES.includes(input.mime.toLowerCase())) {
      throw Errors.badRequest(
        `Unsupported file type "${input.mime}". Allowed: jpg, png, webp, gif, pdf.`
      );
    }

    // base64 size = 4/3 * binary size (rounded up to multiple of 4)
    const approxBinary = Math.floor((input.base64.length * 3) / 4);
    if (approxBinary > MAX_BINARY_BYTES) {
      throw Errors.badRequest("File too large. Max 2 MB.");
    }

    const created = await UploadedFile.create({
      ownerId: req.auth!.sub,
      filename: input.filename,
      mime: input.mime,
      sizeBytes: approxBinary,
      data: input.base64,
    });

    const base = process.env.PUBLIC_API_URL ?? `http://localhost:${process.env.PORT ?? 4000}`;
    const url = `${base}/api/upload/file/${String(created._id)}`;
    res.json({ ok: true, data: { url, id: String(created._id), sizeBytes: approxBinary } });
  })
);

/**
 * Public file fetch. Anyone with the URL can view (this is fine for credential
 * documents the doctor explicitly submitted to the platform — admin needs to see them).
 * For stronger privacy we'd add a signed-URL scheme; out of scope for hackathon.
 */
uploadRouter.get(
  "/file/:id",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id ?? "");
    if (!Types.ObjectId.isValid(id)) throw Errors.notFound("File not found");
    const doc = await UploadedFile.findById(id);
    if (!doc) throw Errors.notFound("File not found");
    const buf = Buffer.from(doc.data, "base64");
    res.setHeader("Content-Type", doc.mime);
    res.setHeader("Content-Length", String(buf.length));
    res.setHeader("Content-Disposition", `inline; filename="${doc.filename.replace(/"/g, "")}"`);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(buf);
  })
);
