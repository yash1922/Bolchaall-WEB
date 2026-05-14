import { Router } from "express";
import { Types } from "mongoose";
import { asyncHandler } from "../lib/asyncHandler";
import { Errors } from "../lib/errors";
import { requireAuth, requireRole } from "../auth/middleware";
import {
  AssignExerciseInput,
  AssignmentFeedbackInput,
  DoctorApplyInput,
} from "../lib/zodSchemas";
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
          fullName: input.fullName,
          phone: input.phone,
          qualification: input.qualification,
          specialization: input.specialization,
          linkedinUrl: input.linkedinUrl,
          clinicName: input.clinicName,
          license: input.license,
          experienceYears: input.experienceYears,
          certifications: input.certifications,
          bio: input.bio,
          govIdUrl: input.govIdUrl || null,
          licenseDocUrl: input.licenseDocUrl || null,
          certificationsUrls: input.certificationsUrls,
          status: "pending",
          submittedAt: new Date(),
          rejectedAt: null,
          adminRemarks: "",
        },
      },
      { new: true }
    );
    if (!updated) throw Errors.notFound("Doctor profile not found");
    res.json({
      ok: true,
      data: { status: updated.status, submittedAt: updated.submittedAt },
    });
  })
);

// Read-only "my profile" for doctor — used by onboarding form to pre-fill on resubmit.
doctorRouter.get(
  "/profile",
  asyncHandler(async (req, res) => {
    const profile = await DoctorProfile.findOne({ userId: req.auth!.sub }).lean();
    if (!profile) throw Errors.notFound("Doctor profile not found");
    res.json({
      ok: true,
      data: {
        status: profile.status,
        fullName: profile.fullName ?? "",
        phone: profile.phone ?? "",
        qualification: profile.qualification ?? "",
        specialization: profile.specialization ?? "",
        linkedinUrl: profile.linkedinUrl ?? "",
        clinicName: profile.clinicName ?? "",
        license: profile.license ?? "",
        experienceYears: profile.experienceYears ?? 0,
        certifications: profile.certifications ?? [],
        bio: profile.bio ?? "",
        govIdUrl: profile.govIdUrl ?? null,
        licenseDocUrl: profile.licenseDocUrl ?? null,
        certificationsUrls: profile.certificationsUrls ?? [],
        adminRemarks: profile.adminRemarks ?? "",
        submittedAt: profile.submittedAt?.toISOString() ?? null,
        approvedAt: profile.approvedAt?.toISOString() ?? null,
        rejectedAt: profile.rejectedAt?.toISOString() ?? null,
      },
    });
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
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    // Show: global library + this therapist's own exercises
    const list = await Exercise.find({
      $or: [{ isGlobal: true }, { createdById: userId }],
    })
      .sort({ isGlobal: -1, difficulty: 1, title: 1 })
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
        items: e.items,
        setName: e.setName ?? "Custom",
        setOrder: e.setOrder ?? 0,
        tier: (e.tier ?? "beginner") as "beginner" | "intermediate" | "advanced",
        isGlobal: e.isGlobal,
        isMine: e.createdById ? String(e.createdById) === userId : false,
      })),
    });
  })
);

doctorRouter.post(
  "/exercises",
  asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const type = body.type === "perception" ? "perception" : "production";
    const difficulty: "easy" | "medium" | "hard" =
      body.difficulty === "medium"
        ? "medium"
        : body.difficulty === "hard"
        ? "hard"
        : "easy";
    const targetPhonemes = Array.isArray(body.targetPhonemes)
      ? (body.targetPhonemes as unknown[]).map((s) => String(s)).slice(0, 10)
      : [];
    type CleanItem = { prompt: string; targetWord: string; altWord: string | null };
    const itemsRaw: unknown[] = Array.isArray(body.items) ? body.items : [];
    const items: CleanItem[] = itemsRaw
      .map((it: unknown): CleanItem | null => {
        const i = it as Record<string, unknown>;
        const prompt = String(i.prompt ?? "Say the word").slice(0, 200);
        const targetWord = String(i.targetWord ?? "").trim().slice(0, 80);
        const altWord = i.altWord ? String(i.altWord).trim().slice(0, 80) : null;
        return targetWord ? { prompt, targetWord, altWord } : null;
      })
      .filter((x: CleanItem | null): x is CleanItem => x !== null)
      .slice(0, 30);

    if (title.length < 3) throw Errors.badRequest("Title must be at least 3 characters.");
    if (items.length === 0) throw Errors.badRequest("Add at least one item to the exercise.");
    if (type === "perception" && items.some((it) => !it.altWord))
      throw Errors.badRequest("Perception items need both targetWord and altWord.");

    const created = await Exercise.create({
      title,
      description,
      targetPhonemes,
      type,
      difficulty,
      items,
      isGlobal: false,
      createdById: req.auth!.sub,
      setName: "My exercises",
      setOrder: 0,
    });
    res.json({ ok: true, data: { id: String(created._id) } });
  })
);

doctorRouter.delete(
  "/exercises/:id",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    const ex = await Exercise.findOneAndDelete({
      _id: req.params.id,
      createdById: userId,
      isGlobal: false,
    });
    if (!ex) throw Errors.notFound("Exercise not found or not yours to delete.");
    res.json({ ok: true, data: { deleted: true } });
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

// ─── Assignment review (therapist sees patient submissions, gives feedback) ───

doctorRouter.get(
  "/assignments",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    const filter = String(req.query.filter ?? "all"); // all | pending_review | reviewed | open
    const q: Record<string, unknown> = { doctorId: userId };
    if (filter === "pending_review") {
      q.completedAt = { $ne: null };
      q.reviewedAt = null;
    } else if (filter === "reviewed") {
      q.reviewedAt = { $ne: null };
    } else if (filter === "open") {
      q.completedAt = null;
    }

    const list = await Assignment.find(q)
      .sort({ completedAt: -1, createdAt: -1 })
      .populate("exerciseId", "title type difficulty targetPhonemes")
      .populate("patientId", "name email")
      .lean();

    res.json({
      ok: true,
      data: list.map((a) => {
        const p = a.patientId as unknown as { _id: Types.ObjectId; name: string; email: string };
        const ex = a.exerciseId as unknown as {
          _id: Types.ObjectId;
          title: string;
          type: string;
          difficulty: string;
          targetPhonemes: string[];
        };
        return {
          id: String(a._id),
          patientId: String(p._id),
          patientName: p.name,
          patientEmail: p.email,
          exerciseId: String(ex._id),
          exerciseTitle: ex.title,
          exerciseType: ex.type,
          exerciseDifficulty: ex.difficulty,
          exerciseTargetPhonemes: ex.targetPhonemes ?? [],
          dueAt: a.dueAt?.toISOString() ?? null,
          completedAt: a.completedAt?.toISOString() ?? null,
          reviewedAt: a.reviewedAt?.toISOString() ?? null,
          therapistFeedback: a.therapistFeedback ?? "",
          therapistManualScore: a.therapistManualScore ?? null,
          note: a.note ?? "",
          createdAt: a.createdAt.toISOString(),
        };
      }),
    });
  })
);

doctorRouter.get(
  "/assignments/:id",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    const assignment = await Assignment.findOne({ _id: req.params.id, doctorId: userId })
      .populate("exerciseId", "title type difficulty targetPhonemes items")
      .populate("patientId", "name email")
      .lean();
    if (!assignment) throw Errors.notFound("Assignment not found");

    const p = assignment.patientId as unknown as { _id: Types.ObjectId; name: string; email: string };
    const ex = assignment.exerciseId as unknown as {
      _id: Types.ObjectId;
      title: string;
      type: string;
      difficulty: string;
      targetPhonemes: string[];
      items: Array<{ prompt: string; targetWord: string; altWord?: string | null }>;
    };

    // All scores the patient submitted that are linked to this assignment
    const scores = await Score.find({ assignmentId: assignment._id })
      .sort({ createdAt: 1 })
      .lean();

    res.json({
      ok: true,
      data: {
        id: String(assignment._id),
        patient: { id: String(p._id), name: p.name, email: p.email },
        exercise: {
          id: String(ex._id),
          title: ex.title,
          type: ex.type,
          difficulty: ex.difficulty,
          targetPhonemes: ex.targetPhonemes ?? [],
          items: ex.items ?? [],
        },
        dueAt: assignment.dueAt?.toISOString() ?? null,
        completedAt: assignment.completedAt?.toISOString() ?? null,
        reviewedAt: assignment.reviewedAt?.toISOString() ?? null,
        therapistFeedback: assignment.therapistFeedback ?? "",
        therapistManualScore: assignment.therapistManualScore ?? null,
        note: assignment.note ?? "",
        scores: scores.map((s) => ({
          id: String(s._id),
          score: s.score,
          selfRating: s.selfRating,
          audioUrl: s.audioUrl,
          createdAt: s.createdAt.toISOString(),
        })),
      },
    });
  })
);

doctorRouter.post(
  "/assignments/:id/feedback",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    const input = AssignmentFeedbackInput.parse(req.body);
    const updated = await Assignment.findOneAndUpdate(
      { _id: req.params.id, doctorId: userId },
      {
        $set: {
          therapistFeedback: input.feedback,
          therapistManualScore: input.manualScore,
          reviewedAt: new Date(),
        },
      },
      { new: true }
    );
    if (!updated) throw Errors.notFound("Assignment not found");
    res.json({
      ok: true,
      data: {
        id: String(updated._id),
        therapistFeedback: updated.therapistFeedback,
        therapistManualScore: updated.therapistManualScore,
        reviewedAt: updated.reviewedAt?.toISOString() ?? null,
      },
    });
  })
);
