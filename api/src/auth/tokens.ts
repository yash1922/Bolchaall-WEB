import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import type { Role } from "shared";

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  email: string;
}

function requireSecret(name: "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET"): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, requireSecret("JWT_ACCESS_SECRET"), {
    expiresIn: process.env.JWT_ACCESS_TTL ?? "15m",
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, requireSecret("JWT_ACCESS_SECRET"));
  if (typeof decoded === "string") throw new Error("invalid token shape");
  const { sub, role, email } = decoded as jwt.JwtPayload & Partial<AccessTokenPayload>;
  if (!sub || !role || !email) throw new Error("invalid token payload");
  return { sub, role, email };
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

export function generateRefreshTokenPair(userId: string): {
  raw: string;
  hash: string;
  expiresAt: Date;
} {
  const raw = crypto.randomBytes(48).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const ttlDays = parseTtlDays(process.env.JWT_REFRESH_TTL ?? "14d");
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  // userId is included in the cookie payload alongside the raw token via signed cookie? For simplicity we just store the raw and look up by hash.
  void userId;
  return { raw, hash, expiresAt };
}

export function hashRefreshToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function parseTtlDays(ttl: string): number {
  const m = ttl.match(/^(\d+)([dh])$/);
  if (!m) return 14;
  const n = Number(m[1]);
  if (m[2] === "h") return n / 24;
  return n;
}
