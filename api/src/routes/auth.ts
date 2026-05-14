import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { Errors } from "../lib/errors";
import { LoginInput, SignupInput } from "../lib/zodSchemas";
import { hashPassword, verifyPassword } from "../auth/passwords";
import {
  generateRefreshTokenPair,
  hashRefreshToken,
  signAccessToken,
} from "../auth/tokens";
import { User } from "../models/User";
import { RefreshToken } from "../models/RefreshToken";
import { Patient } from "../models/Patient";
import { DoctorProfile } from "../models/DoctorProfile";
import { Emails } from "../services/email";
import { assignTrialTherapist } from "../lib/therapistAssignment";
import type { Role } from "shared";

const REFRESH_COOKIE = "bolchall_refresh";

function setRefreshCookie(res: import("express").Response, raw: string, expiresAt: Date) {
  res.cookie(REFRESH_COOKIE, raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/api/auth",
  });
}

function clearRefreshCookie(res: import("express").Response) {
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
}

export const authRouter = Router();

authRouter.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const input = SignupInput.parse(req.body);

    const existing = await User.findOne({ email: input.email }).lean();
    if (existing) throw Errors.conflict("Email already registered", "EMAIL_TAKEN");

    const passwordHash = await hashPassword(input.password);
    const user = await User.create({
      email: input.email,
      name: input.name,
      role: input.role,
      passwordHash,
    });

    if (input.role === "patient") {
      const trialEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      await Patient.create({
        userId: user._id,
        language: "en",
        conditions: [],
        subscriptionStatus: "trial",
        trialEndsAt,
        onboardingComplete: false,
      });
      // Auto-match a therapist for the 3-day trial. They'll be revoked when the trial
      // expires unless the patient upgrades — handled in revokeExpiredTrialAssignment.
      try {
        await assignTrialTherapist(user.id);
      } catch (e) {
        console.warn("[signup] auto-assign therapist failed:", e);
      }
      void Emails.patientWelcome(user.email, user.name);
    } else if (input.role === "doctor") {
      await DoctorProfile.create({
        userId: user._id,
        license: "",
        certifications: [],
        experienceYears: 0,
        bio: "",
        status: "unsubmitted", // gates to /doctor/onboarding until they submit credentials
      });
    }

    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role as Role,
      email: user.email,
    });
    const { raw, hash, expiresAt } = generateRefreshTokenPair(user.id);
    await RefreshToken.create({
      userId: user._id,
      tokenHash: hash,
      expiresAt,
      ip: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
    });
    setRefreshCookie(res, raw, expiresAt);

    res.json({
      ok: true,
      data: {
        user: serializeUser(user),
        accessToken,
      },
    });
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = LoginInput.parse(req.body);
    const user = await User.findOne({ email: input.email });
    if (!user) throw Errors.unauthorized("Invalid credentials", "INVALID_CREDENTIALS");
    if (user.suspended) throw Errors.forbidden("Account suspended", "SUSPENDED");

    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) throw Errors.unauthorized("Invalid credentials", "INVALID_CREDENTIALS");

    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role as Role,
      email: user.email,
    });
    const { raw, hash, expiresAt } = generateRefreshTokenPair(user.id);
    await RefreshToken.create({
      userId: user._id,
      tokenHash: hash,
      expiresAt,
      ip: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
    });
    setRefreshCookie(res, raw, expiresAt);

    res.json({
      ok: true,
      data: {
        user: serializeUser(user),
        accessToken,
      },
    });
  })
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (!raw) throw Errors.unauthorized("No refresh token");
    const tokenHash = hashRefreshToken(raw);
    const token = await RefreshToken.findOne({ tokenHash });
    if (!token || token.revokedAt) {
      // Possible reuse — in a stricter implementation we'd revoke the entire family.
      throw Errors.unauthorized("Refresh token invalid", "REFRESH_INVALID");
    }
    if (token.expiresAt.getTime() < Date.now()) {
      throw Errors.unauthorized("Refresh token expired", "REFRESH_EXPIRED");
    }
    const user = await User.findById(token.userId);
    if (!user || user.suspended) throw Errors.unauthorized("User unavailable");

    const next = generateRefreshTokenPair(user.id);
    await RefreshToken.create({
      userId: user._id,
      tokenHash: next.hash,
      expiresAt: next.expiresAt,
      ip: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
    });
    token.revokedAt = new Date();
    token.replacedByHash = next.hash;
    await token.save();

    setRefreshCookie(res, next.raw, next.expiresAt);

    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role as Role,
      email: user.email,
    });
    res.json({ ok: true, data: { accessToken } });
  })
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (raw) {
      const tokenHash = hashRefreshToken(raw);
      await RefreshToken.updateOne({ tokenHash }, { $set: { revokedAt: new Date() } });
    }
    clearRefreshCookie(res);
    res.json({ ok: true, data: { loggedOut: true } });
  })
);

function serializeUser(u: import("../models/User").UserDoc) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    suspended: u.suspended,
    createdAt: u.createdAt.toISOString(),
  };
}
