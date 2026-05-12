import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../auth/middleware";
import { OnboardingInput } from "../lib/zodSchemas";
import { Patient } from "../models/Patient";
import { Errors } from "../lib/errors";

export const onboardingRouter = Router();

onboardingRouter.post(
  "/complete",
  requireAuth,
  requireRole("patient"),
  asyncHandler(async (req, res) => {
    const input = OnboardingInput.parse(req.body);
    const patient = await Patient.findOneAndUpdate(
      { userId: req.auth!.sub },
      {
        $set: {
          language: input.language,
          conditions: input.conditions,
          onboardingComplete: true,
        },
      },
      { new: true }
    );
    if (!patient) throw Errors.notFound("Patient profile not found");
    res.json({ ok: true, data: { onboardingComplete: true } });
  })
);
