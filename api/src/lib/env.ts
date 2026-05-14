/**
 * Validate required environment variables on api boot.
 * In production we fail fast with a clear error so a misconfigured deploy doesn't
 * silently start with broken auth or database access.
 */
export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === "production";

  const required = ["MONGODB_URI", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];
  const missing = required.filter((k) => !process.env[k] || process.env[k]?.length === 0);
  if (missing.length > 0) {
    throw new Error(
      `[env] missing required environment variables: ${missing.join(", ")}.\n` +
        "Set them in your hosting provider's environment settings (Render dashboard for the API)."
    );
  }

  // Soft warnings
  if (process.env.JWT_ACCESS_SECRET && process.env.JWT_ACCESS_SECRET.length < 32) {
    console.warn(
      "[env] JWT_ACCESS_SECRET is shorter than 32 chars — generate a stronger one for production."
    );
  }
  if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
    console.warn(
      "[env] JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are identical — they should be different."
    );
  }
  if (isProd && !process.env.WEB_ORIGIN) {
    console.warn(
      "[env] WEB_ORIGIN is not set — CORS will reject all browser requests in production."
    );
  }
  if (isProd && !process.env.PUBLIC_API_URL) {
    console.warn(
      "[env] PUBLIC_API_URL is not set — uploaded file URLs will use http://localhost:<PORT>."
    );
  }
}
