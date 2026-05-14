"use client";

import { api } from "./api-client";

/** Read a File as a base64 string (no data URL prefix) and POST to /api/upload/base64. */
export async function uploadFileBase64(file: File): Promise<string> {
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("File too large. Max 2 MB.");
  }
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the "data:<mime>;base64," prefix
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
  const r = await api.uploadBase64({
    filename: file.name,
    mime: file.type || "application/octet-stream",
    base64,
  });
  return r.url;
}
