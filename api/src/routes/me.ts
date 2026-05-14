import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { Errors } from "../lib/errors";
import { requireAuth } from "../auth/middleware";
import { User } from "../models/User";
import { Patient } from "../models/Patient";
import { DoctorProfile } from "../models/DoctorProfile";
import { revokeExpiredTrialAssignment } from "../lib/therapistAssignment";

export const meRouter = Router();

meRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    const user = await User.findById(userId).lean();
    if (!user) throw Errors.notFound("User not found");

    const payload: Record<string, unknown> = {
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        role: user.role,
        suspended: user.suspended,
        createdAt: user.createdAt.toISOString(),
      },
    };

    if (user.role === "patient") {
      // If trial expired and not on a paid plan, drop the assigned therapist before serving.
      await revokeExpiredTrialAssignment(userId);

      const patient = await Patient.findOne({ userId }).lean();
      if (patient) {
        payload.patient = {
          id: String(patient._id),
          userId: String(patient.userId),
          language: patient.language,
          conditions: patient.conditions,
          xp: patient.xp,
          coins: patient.coins,
          streakDays: patient.streakDays,
          lastPracticedAt: patient.lastPracticedAt?.toISOString() ?? null,
          unlockedBadges: patient.unlockedBadges,
          subscriptionStatus: patient.subscriptionStatus,
          trialEndsAt: patient.trialEndsAt?.toISOString() ?? null,
          assignedDoctorId: patient.assignedDoctorId ? String(patient.assignedDoctorId) : null,
          onboardingComplete: patient.onboardingComplete,
        };
      }
    } else if (user.role === "doctor") {
      const doctor = await DoctorProfile.findOne({ userId }).lean();
      if (doctor) {
        payload.doctor = {
          id: String(doctor._id),
          userId: String(doctor.userId),
          license: doctor.license,
          certifications: doctor.certifications,
          experienceYears: doctor.experienceYears,
          bio: doctor.bio,
          status: doctor.status,
          rating: doctor.rating,
          fullName: doctor.fullName ?? "",
          phone: doctor.phone ?? "",
          qualification: doctor.qualification ?? "",
          specialization: doctor.specialization ?? "",
          linkedinUrl: doctor.linkedinUrl ?? "",
          clinicName: doctor.clinicName ?? "",
          govIdUrl: doctor.govIdUrl ?? null,
          licenseDocUrl: doctor.licenseDocUrl ?? null,
          certificationsUrls: doctor.certificationsUrls ?? [],
          adminRemarks: doctor.adminRemarks ?? "",
          submittedAt: doctor.submittedAt?.toISOString() ?? null,
          approvedAt: doctor.approvedAt?.toISOString() ?? null,
          rejectedAt: doctor.rejectedAt?.toISOString() ?? null,
        };
      }
    }

    res.json({ ok: true, data: payload });
  })
);
