import { Router } from "express";
import { Types } from "mongoose";
import { asyncHandler } from "../lib/asyncHandler";
import { Errors } from "../lib/errors";
import { requireAuth, requireRole } from "../auth/middleware";
import { AssignExerciseInput, DoctorApplyInput } from "../lib/zodSchemas";
import { DoctorProfile } from "../models/DoctorProfile";
import { Patient } from "../models/Patient";
import { User } from "../models/User";
import { Exercise } from "../models/Exercise";
import { Assignment } from "../models/Assignment";
import { Score } from "../models/Score";
import { Emails } from "../services/email";

export const doctorRouter = Router();

doctorRouter.use(requireAuth, requireRole("doctor"));

doctorRouter.post(
  "/apply",
  asyncHandler(async (req, res) => {
    const input = DoctorApplyInput.parse(req.body);
    const updated = await DoctorProfile.findOneAndUpdate(
      { userId: req.auth!.sub },
      {
        $set: {
          license: input.license,
          experienceYears: input.experienceYears,
          certifications: input.certifications,
          bio: input.bio,
          status: "pending",
        },
      },
      { new: true }
    );
    if (!updated) throw Errors.notFound("Doctor profile not found");
    res.json({ ok: true, data: { status: updated.status } });
  })
);

doctorRouter.get(
  "/dashboard",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    const doctor = await DoctorProfile.findOne({ userId }).lean();
    if (!doctor) throw Errors.notFound("Doctor not found");

    const patients = await Patient.find({ assignedDoctorId: userId })
      .populate("userId", "name email")
      .lean();

    const patientUserIds = patients.map((p) => p.userId);
    const [assignmentsOpen, recentScores] = await Promise.all([
      Assignment.countDocuments({ doctorId: userId, completedAt: null }),
      Score.find({ patientId: { $in: patientUserIds } })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    res.json({
      ok: true,
      data: {
        doctor: {
          id: String(doctor._id),
          status: doctor.status,
          rating: doctor.rating,
          experienceYears: doctor.experienceYears,
        },
        patientsCount: patients.length,
        assignmentsOpen,
        avgRecentScore:
          recentScores.length > 0
            ? Math.round(
                recentScores.reduce((s, x) => s + x.score, 0) / recentScores.length
              )
            : null,
      },
    });
  })
);

doctorRouter.get(
  "/patients",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    const patients = await Patient.find({ assignedDoctorId: userId })
      .populate("userId", "name email")
      .lean();
    res.json({
      ok: true,
      data: patients.map((p) => {
        const u = p.userId as unknown as { _id: Types.ObjectId; name: string; email: string };
        return {
          id: String(p._id),
          userId: String(u._id),
          name: u.name,
          email: u.email,
          xp: p.xp,
          coins: p.coins,
          streakDays: p.streakDays,
          subscriptionStatus: p.subscriptionStatus,
          conditions: p.conditions,
        };
      }),
    });
  })
);

doctorRouter.get(
  "/patients/:patientUserId",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    const patient = await Patient.findOne({
      userId: req.params.patientUserId,
      assignedDoctorId: userId,
    })
      .populate("userId", "name email")
      .lean();
    if (!patient) throw Errors.notFound("Patient not found in your roster");
    const u = patient.userId as unknown as { _id: Types.ObjectId; name: string; email: string };
    const recentScores = await Score.find({ patientId: u._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    const assignments = await Assignment.find({ patientId: u._id, doctorId: userId })
      .populate("exerciseId", "title type difficulty")
      .sort({ createdAt: -1 })
      .lean();
    res.json({
      ok: true,
      data: {
        patient: {
          id: String(patient._id),
          userId: String(u._id),
          name: u.name,
          email: u.email,
          xp: patient.xp,
          coins: patient.coins,
          streakDays: patient.streakDays,
          conditions: patient.conditions,
          subscriptionStatus: patient.subscriptionStatus,
        },
        recentScores: recentScores.map((s) => ({
          id: String(s._id),
          exerciseId: String(s.exerciseId),
          score: s.score,
          createdAt: s.createdAt.toISOString(),
        })),
        assignments: assignments.map((a) => ({
          id: String(a._id),
          exerciseId: String((a.exerciseId as { _id: Types.ObjectId })._id),
          exerciseTitle: (a.exerciseId as unknown as { title: string }).title,
          dueAt: a.dueAt?.toISOString() ?? null,
          completedAt: a.completedAt?.toISOString() ?? null,
          createdAt: a.createdAt.toISOString(),
        })),
      },
    });
  })
);

doctorRouter.post(
  "/assignments",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    const input = AssignExerciseInput.parse(req.body);
    const patient = await Patient.findOne({
      userId: input.patientId,
      assignedDoctorId: userId,
    });
    if (!patient) throw Errors.forbidden("Patient is not in your roster");
    const exercise = await Exercise.findById(input.exerciseId).lean();
    if (!exercise) throw Errors.notFound("Exercise not found");
    const created = await Assignment.create({
      patientId: input.patientId,
      doctorId: userId,
      exerciseId: input.exerciseId,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
    });

    const [patientUser, doctorUser] = await Promise.all([
      User.findById(input.patientId).select("email name").lean(),
      User.findById(userId).select("name").lean(),
    ]);
    if (patientUser && doctorUser) {
      void Emails.newAssignment(
        patientUser.email,
        patientUser.name,
        exercise.title,
        doctorUser.name
      );
    }

    res.json({
      ok: true,
      data: {
        id: String(created._id),
        patientId: String(created.patientId),
        doctorId: String(created.doctorId),
        exerciseId: String(created.exerciseId),
        exerciseTitle: exercise.title,
        dueAt: created.dueAt?.toISOString() ?? null,
        completedAt: null,
        createdAt: created.createdAt.toISOString(),
      },
    });
  })
);

doctorRouter.get(
  "/exercises",
  asyncHandler(async (_req, res) => {
    const list = await Exercise.find({ isGlobal: true })
      .sort({ difficulty: 1, title: 1 })
      .lean();
    res.json({
      ok: true,
      data: list.map((e) => ({
        id: String(e._id),
        title: e.title,
        description: e.description,
        targetPhonemes: e.targetPhonemes,
        type: e.type,
        difficulty: e.difficulty,
      })),
    });
  })
);

doctorRouter.get(
  "/available-patients",
  asyncHandler(async (_req, res) => {
    const list = await Patient.find({ assignedDoctorId: null })
      .populate("userId", "name email")
      .lean();
    res.json({
      ok: true,
      data: list.map((p) => {
        const u = p.userId as unknown as { _id: Types.ObjectId; name: string; email: string };
        return {
          patientId: String(p._id),
          userId: String(u._id),
          name: u.name,
          email: u.email,
          conditions: p.conditions,
        };
      }),
    });
  })
);

doctorRouter.post(
  "/claim/:patientUserId",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    const patient = await Patient.findOneAndUpdate(
      { userId: req.params.patientUserId, assignedDoctorId: null },
      { $set: { assignedDoctorId: userId } },
      { new: true }
    );
    if (!patient) throw Errors.conflict("Patient unavailable", "ALREADY_CLAIMED");
    res.json({ ok: true, data: { claimed: true } });
  })
);
