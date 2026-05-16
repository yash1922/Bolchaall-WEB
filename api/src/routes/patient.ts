import { Router } from "express";
import { Types } from "mongoose";
import { asyncHandler } from "../lib/asyncHandler";
import { Errors } from "../lib/errors";
import { requireAuth, requireRole } from "../auth/middleware";
import { ScoreSubmitInput, TherapistRatingInput, ActivityScoreInput } from "../lib/zodSchemas";
import { Patient } from "../models/Patient";
import { User } from "../models/User";
import { Exercise } from "../models/Exercise";
import { Assignment } from "../models/Assignment";
import { Score } from "../models/Score";
import { Achievement } from "../models/Achievement";
import { PhonemeWord } from "../models/PhonemeWord";
import { DoctorProfile } from "../models/DoctorProfile";
import { TherapistRating } from "../models/TherapistRating";
import {
  assignTrialTherapist,
  revokeExpiredTrialAssignment,
} from "../lib/therapistAssignment";

export const patientRouter = Router();

patientRouter.use(requireAuth, requireRole("patient"));

patientRouter.get(
  "/dashboard",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    await revokeExpiredTrialAssignment(userId);
    const patient = await Patient.findOne({ userId }).lean();
    if (!patient) throw Errors.notFound("Patient not found");

    const [recentScores, openAssignmentsCount, achievements] = await Promise.all([
      Score.find({ patientId: userId }).sort({ createdAt: -1 }).limit(10).lean(),
      Assignment.countDocuments({ patientId: userId, completedAt: null }),
      Achievement.find().lean(),
    ]);

    const doctor = patient.assignedDoctorId
      ? await User.findById(patient.assignedDoctorId).select("name email").lean()
      : null;

    res.json({
      ok: true,
      data: {
        patient: serializePatient(patient),
        recentScores: recentScores.map(serializeScore),
        openAssignmentsCount,
        assignedDoctor: doctor
          ? { id: String(doctor._id), name: doctor.name, email: doctor.email }
          : null,
        achievements: achievements.map((a) => ({
          id: a.code,
          name: a.name,
          description: a.description,
          icon: a.icon,
          unlocked: patient.unlockedBadges.includes(a.code),
        })),
      },
    });
  })
);

patientRouter.get(
  "/assignments",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    const open = req.query.open === "true";
    const filter: Record<string, unknown> = { patientId: userId };
    if (open) filter.completedAt = null;
    const list = await Assignment.find(filter)
      .sort({ createdAt: -1 })
      .populate("exerciseId", "title description type difficulty targetPhonemes")
      .populate("doctorId", "name")
      .lean();
    res.json({
      ok: true,
      data: list.map((a) => {
        const ex = a.exerciseId as unknown as {
          _id: Types.ObjectId;
          title: string;
          description: string;
          type: string;
          difficulty: string;
          targetPhonemes: string[];
        };
        const doc = a.doctorId as unknown as { _id: Types.ObjectId; name: string };
        return {
          id: String(a._id),
          patientId: String(a.patientId),
          doctorId: String(doc._id),
          doctorName: doc.name,
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

// Patient rates their currently-assigned therapist (1–5 stars + optional comment).
// Updates DoctorProfile.rating with the rolling mean of all ratings for that doctor.
patientRouter.post(
  "/therapist/rate",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    const input = TherapistRatingInput.parse(req.body);

    const patient = await Patient.findOne({ userId }).select("assignedDoctorId");
    if (!patient || !patient.assignedDoctorId) {
      throw Errors.badRequest("You don't have an assigned therapist to rate.");
    }
    const doctorId = patient.assignedDoctorId;

    await TherapistRating.findOneAndUpdate(
      { patientId: userId, doctorId },
      {
        $set: {
          stars: input.stars,
          comment: input.comment ?? "",
        },
      },
      { upsert: true, new: true }
    );

    // Recompute mean rating for that doctor
    const all = await TherapistRating.find({ doctorId }).select("stars").lean();
    const mean =
      all.length > 0 ? all.reduce((s, r) => s + r.stars, 0) / all.length : 5;
    await DoctorProfile.updateOne({ userId: doctorId }, { $set: { rating: mean } });

    res.json({
      ok: true,
      data: {
        stars: input.stars,
        comment: input.comment ?? "",
        averageRating: Math.round(mean * 10) / 10,
        ratingCount: all.length,
      },
    });
  })
);

patientRouter.get(
  "/therapist/rating",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    const patient = await Patient.findOne({ userId }).select("assignedDoctorId").lean();
    if (!patient?.assignedDoctorId) {
      res.json({ ok: true, data: { stars: null, comment: "", averageRating: null, ratingCount: 0 } });
      return;
    }
    const myRating = await TherapistRating.findOne({
      patientId: userId,
      doctorId: patient.assignedDoctorId,
    }).lean();
    const all = await TherapistRating.find({ doctorId: patient.assignedDoctorId })
      .select("stars")
      .lean();
    const mean = all.length > 0 ? all.reduce((s, r) => s + r.stars, 0) / all.length : null;
    res.json({
      ok: true,
      data: {
        stars: myRating?.stars ?? null,
        comment: myRating?.comment ?? "",
        averageRating: mean !== null ? Math.round(mean * 10) / 10 : null,
        ratingCount: all.length,
      },
    });
  })
);

patientRouter.get(
  "/scores",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    const list = await Score.find({ patientId: userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ ok: true, data: list.map(serializeScore) });
  })
);

patientRouter.post(
  "/scores",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    const input = ScoreSubmitInput.parse(req.body);
    const exercise = await Exercise.findById(input.exerciseId).lean();
    if (!exercise) throw Errors.notFound("Exercise not found");

    // If this score belongs to an assignment, validate ownership and link it.
    let linkedAssignmentId: typeof exercise._id | null = null;
    if (input.assignmentId) {
      const linked = await Assignment.findOne({
        _id: input.assignmentId,
        patientId: userId,
      }).select("_id");
      if (linked) linkedAssignmentId = linked._id;
    }

    const created = await Score.create({
      patientId: userId,
      exerciseId: exercise._id,
      assignmentId: linkedAssignmentId,
      score: input.score,
      selfRating: input.selfRating,
      audioUrl: input.audioUrl,
      mfccVector: input.mfccVector,
    });

    const xpGain = Math.round(input.score / 5);
    const coinGain = 10 + (input.score >= 80 ? 50 : 0);

    const patient = await Patient.findOne({ userId });
    if (!patient) throw Errors.notFound("Patient not found");

    patient.xp += xpGain;
    patient.coins += coinGain;

    const now = new Date();
    if (!patient.lastPracticedAt) {
      patient.streakDays = 1;
    } else {
      const last = patient.lastPracticedAt;
      const sameDay =
        last.getFullYear() === now.getFullYear() &&
        last.getMonth() === now.getMonth() &&
        last.getDate() === now.getDate();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const wasYesterday =
        last.getFullYear() === yesterday.getFullYear() &&
        last.getMonth() === yesterday.getMonth() &&
        last.getDate() === yesterday.getDate();
      if (sameDay) {
        // unchanged
      } else if (wasYesterday) {
        patient.streakDays += 1;
      } else {
        patient.streakDays = 1;
      }
    }
    patient.lastPracticedAt = now;

    const newlyUnlocked = await evaluateAchievements(patient, userId, input.exerciseId, exercise.targetPhonemes ?? []);
    if (newlyUnlocked.length > 0) {
      patient.unlockedBadges = Array.from(new Set([...patient.unlockedBadges, ...newlyUnlocked]));
    }

    await patient.save();

    if (req.body.assignmentId) {
      await Assignment.findOneAndUpdate(
        { _id: req.body.assignmentId, patientId: userId },
        { $set: { completedAt: now } }
      );
    }

    res.json({
      ok: true,
      data: {
        score: serializeScore(created.toObject()),
        xpGained: xpGain,
        coinsGained: coinGain,
        newlyUnlockedBadges: newlyUnlocked,
        totalXp: patient.xp,
        totalCoins: patient.coins,
        streakDays: patient.streakDays,
      },
    });
  })
);

/**
 * POST /api/patient/activity-score
 * Award XP/coins for the gamified phoneme blending / deleting activities.
 * Mirrors the logic of POST /scores but with no exerciseId (activities aren't
 * exercises) and uses accuracy% as the score input.
 */
patientRouter.post(
  "/activity-score",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    const input = ActivityScoreInput.parse(req.body);
    const accuracy = Math.round((input.correct / input.total) * 100);

    const patient = await Patient.findOne({ userId });
    if (!patient) throw Errors.notFound("Patient not found");

    const xpGain = Math.round(accuracy / 5);
    const coinGain = 10 + (accuracy >= 80 ? 30 : 0);
    patient.xp += xpGain;
    patient.coins += coinGain;

    // Streak bookkeeping (same logic as score-submit)
    const now = new Date();
    if (!patient.lastPracticedAt) {
      patient.streakDays = 1;
    } else {
      const last = patient.lastPracticedAt;
      const sameDay =
        last.getFullYear() === now.getFullYear() &&
        last.getMonth() === now.getMonth() &&
        last.getDate() === now.getDate();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const wasYesterday =
        last.getFullYear() === yesterday.getFullYear() &&
        last.getMonth() === yesterday.getMonth() &&
        last.getDate() === yesterday.getDate();
      if (sameDay) {
        // unchanged
      } else if (wasYesterday) {
        patient.streakDays += 1;
      } else {
        patient.streakDays = 1;
      }
    }
    patient.lastPracticedAt = now;
    await patient.save();

    res.json({
      ok: true,
      data: {
        accuracy,
        xpGained: xpGain,
        coinsGained: coinGain,
        totalXp: patient.xp,
        totalCoins: patient.coins,
        streakDays: patient.streakDays,
      },
    });
  })
);

patientRouter.get(
  "/phonemes",
  asyncHandler(async (req, res) => {
    const language = (req.query.language as string) || undefined;
    const filter: Record<string, unknown> = {};
    if (language && (language === "en" || language === "hi")) filter.language = language;
    const list = await PhonemeWord.find(filter).sort({ category: 1, ipa: 1 }).lean();
    res.json({
      ok: true,
      data: list.map((p) => ({
        id: String(p._id),
        ipa: p.ipa,
        label: p.label,
        language: p.language,
        category: p.category,
        articulationTip: p.articulationTip,
        place: p.place,
        manner: p.manner,
        voicing: p.voicing,
        tonguePosition: p.tonguePosition,
        lipShape: p.lipShape,
        sampleWords: p.sampleWords,
      })),
    });
  })
);

patientRouter.get(
  "/phonemes/:id",
  asyncHandler(async (req, res) => {
    const p = await PhonemeWord.findById(req.params.id).lean();
    if (!p) throw Errors.notFound("Phoneme not found");
    res.json({
      ok: true,
      data: {
        id: String(p._id),
        ipa: p.ipa,
        label: p.label,
        language: p.language,
        category: p.category,
        articulationTip: p.articulationTip,
        place: p.place,
        manner: p.manner,
        voicing: p.voicing,
        tonguePosition: p.tonguePosition,
        lipShape: p.lipShape,
        sampleWords: p.sampleWords,
      },
    });
  })
);

patientRouter.get(
  "/exercises",
  asyncHandler(async (req, res) => {
    const list = await Exercise.find({ isGlobal: true }).sort({ difficulty: 1, title: 1 }).lean();
    res.json({ ok: true, data: list.map(serializeExercise) });
  })
);

patientRouter.get(
  "/exercises/:id",
  asyncHandler(async (req, res) => {
    const ex = await Exercise.findById(req.params.id).lean();
    if (!ex) throw Errors.notFound("Exercise not found");
    res.json({ ok: true, data: serializeExercise(ex) });
  })
);

patientRouter.post(
  "/auto-match",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    const patient = await Patient.findOne({ userId });
    if (!patient) throw Errors.notFound("Patient not found");
    if (patient.assignedDoctorId) {
      throw Errors.conflict("You already have a therapist", "ALREADY_MATCHED");
    }
    // Pick the approved doctor with the smallest current roster.
    const doctorProfiles = await DoctorProfile.find({ status: "approved" }).lean();
    if (doctorProfiles.length === 0) {
      throw Errors.notFound("No approved therapists available right now");
    }
    const counts = await Promise.all(
      doctorProfiles.map(async (d) => ({
        userId: d.userId,
        count: await Patient.countDocuments({ assignedDoctorId: d.userId }),
      }))
    );
    counts.sort((a, b) => a.count - b.count);
    const pickedDoctorId = counts[0]!.userId;
    patient.assignedDoctorId = pickedDoctorId;
    await patient.save();

    const doctor = await User.findById(pickedDoctorId).select("name email").lean();
    res.json({
      ok: true,
      data: {
        doctor: doctor
          ? { id: String(doctor._id), name: doctor.name, email: doctor.email }
          : null,
      },
    });
  })
);

/**
 * GET /api/patient/available-therapists
 * Returns the list of approved therapists the patient can choose from, with
 * specialization, roster size, and rating so they can make an informed pick.
 */
patientRouter.get(
  "/available-therapists",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    const profiles = await DoctorProfile.find({ status: "approved" })
      .populate("userId", "name email")
      .lean();
    const counts = await Promise.all(
      profiles.map(async (d) => ({
        userId: String(d.userId),
        count: await Patient.countDocuments({ assignedDoctorId: d.userId }),
      }))
    );
    const countMap = new Map(counts.map((c) => [c.userId, c.count]));

    const patient = await Patient.findOne({ userId }).select("assignedDoctorId").lean();
    const currentDoctorId = patient?.assignedDoctorId ? String(patient.assignedDoctorId) : null;

    res.json({
      ok: true,
      data: profiles.map((d) => {
        const u = d.userId as unknown as { _id: Types.ObjectId; name: string; email: string };
        const uid = String(u._id);
        return {
          userId: uid,
          name: u.name,
          email: u.email,
          specialization: d.specialization ?? "",
          qualification: d.qualification ?? "",
          experienceYears: d.experienceYears ?? 0,
          rating: d.rating ?? null,
          rosterCount: countMap.get(uid) ?? 0,
          isCurrent: uid === currentDoctorId,
        };
      }),
    });
  })
);

/**
 * POST /api/patient/therapist/select
 * body: { doctorUserId: string }
 * Switch the assigned therapist to the chosen approved doctor.
 * Lazy-creates the new chat row so the conversation thread is immediately ready.
 */
patientRouter.post(
  "/therapist/select",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    const doctorUserId = String(req.body?.doctorUserId ?? "");
    if (!Types.ObjectId.isValid(doctorUserId)) {
      throw Errors.badRequest("Invalid doctorUserId");
    }
    const doctor = await DoctorProfile.findOne({ userId: doctorUserId, status: "approved" });
    if (!doctor) throw Errors.badRequest("Therapist must be an approved provider");

    const patient = await Patient.findOneAndUpdate(
      { userId },
      { $set: { assignedDoctorId: doctorUserId } },
      { new: true }
    );
    if (!patient) throw Errors.notFound("Patient not found");

    // Lazy-create the chat row for the new pair so it shows up in inboxes.
    // The unique compound index on (patientId, doctorId) prevents duplicates.
    const { Chat } = await import("../models/Chat");
    try {
      await Chat.create({ patientId: userId, doctorId: doctorUserId });
    } catch (e) {
      if ((e as { code?: number }).code !== 11000) throw e;
    }

    const newDoctor = await User.findById(doctorUserId).select("name email").lean();
    res.json({
      ok: true,
      data: {
        doctor: newDoctor
          ? { id: String(newDoctor._id), name: newDoctor.name, email: newDoctor.email }
          : null,
      },
    });
  })
);

patientRouter.post(
  "/upgrade-demo",
  asyncHandler(async (req, res) => {
    if (process.env.BOLCHALL_DEMO_MODE !== "true") {
      throw Errors.forbidden("Demo upgrade is disabled");
    }
    const userId = req.auth!.sub;
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const patient = await Patient.findOneAndUpdate(
      { userId },
      { $set: { subscriptionStatus: "active", trialEndsAt } },
      { new: true }
    );
    if (!patient) throw Errors.notFound("Patient not found");

    // If they previously lost their therapist (trial-expiration revoke), assign a new one now.
    if (!patient.assignedDoctorId) {
      try {
        await assignTrialTherapist(userId);
      } catch (e) {
        console.warn("[upgrade-demo] re-assign therapist failed:", e);
      }
    }

    res.json({
      ok: true,
      data: {
        subscriptionStatus: patient.subscriptionStatus,
        trialEndsAt: patient.trialEndsAt?.toISOString() ?? null,
      },
    });
  })
);

// Mongoose 8 lean typing is too noisy in strict mode for hand-rolled serializer
// signatures. Use loose shapes — runtime correctness is enforced by mongoose schemas.
type LeanLike = Record<string, unknown> & { _id: unknown };

function serializePatient(p: LeanLike) {
  const last = p.lastPracticedAt as Date | null | undefined;
  const trial = p.trialEndsAt as Date | null | undefined;
  return {
    id: String(p._id),
    userId: String(p.userId),
    language: p.language,
    conditions: p.conditions,
    age: typeof p.age === "number" ? p.age : null,
    phone: typeof p.phone === "string" ? p.phone : "",
    xp: p.xp,
    coins: p.coins,
    streakDays: p.streakDays,
    lastPracticedAt: last ? last.toISOString() : null,
    unlockedBadges: p.unlockedBadges,
    subscriptionStatus: p.subscriptionStatus,
    trialEndsAt: trial ? trial.toISOString() : null,
    assignedDoctorId: p.assignedDoctorId ? String(p.assignedDoctorId) : null,
    onboardingComplete: p.onboardingComplete,
  };
}

function serializeScore(s: LeanLike) {
  return {
    id: String(s._id),
    patientId: String(s.patientId),
    exerciseId: String(s.exerciseId),
    score: s.score,
    selfRating: s.selfRating,
    audioUrl: s.audioUrl,
    createdAt: (s.createdAt as Date).toISOString(),
  };
}

function serializeExercise(e: LeanLike) {
  const items = (e.items as Array<{ prompt: string; targetWord: string; altWord?: string | null }> | undefined) ?? [];
  return {
    id: String(e._id),
    title: e.title,
    description: e.description,
    targetPhonemes: e.targetPhonemes,
    type: e.type,
    difficulty: e.difficulty,
    items: items.map((it) => ({
      prompt: it.prompt,
      targetWord: it.targetWord,
      altWord: it.altWord ?? undefined,
    })),
    audioRefUrl: (e.audioRefUrl as string | null | undefined) ?? null,
    isGlobal: e.isGlobal,
    setName: (e.setName as string | undefined) ?? "Warm-up",
    setOrder: (e.setOrder as number | undefined) ?? 0,
    tier: (e.tier as "beginner" | "intermediate" | "advanced" | undefined) ?? "beginner",
  };
}

async function evaluateAchievements(
  patient: { unlockedBadges: string[]; streakDays: number },
  patientId: string,
  exerciseId: string,
  exerciseTargetPhonemes: string[]
): Promise<string[]> {
  const all = await Achievement.find().lean();
  const newlyUnlocked: string[] = [];

  const totalScores = await Score.countDocuments({ patientId });
  const highScores90Plus = await Score.countDocuments({ patientId, score: { $gte: 90 } });

  for (const a of all) {
    if (patient.unlockedBadges.includes(a.code)) continue;
    const c = a.criteria;
    if (!c) continue;
    let unlocked = false;
    if (c.type === "first_score" && totalScores >= 1) unlocked = true;
    else if (c.type === "streak_days" && patient.streakDays >= (c.threshold ?? 0)) unlocked = true;
    else if (
      c.type === "score_threshold_count" &&
      highScores90Plus >= (c.threshold ?? 0)
    )
      unlocked = true;
    else if (
      c.type === "phoneme_mastery" &&
      c.phoneme &&
      exerciseTargetPhonemes.includes(c.phoneme)
    ) {
      const phonemeHighCount = await Score.countDocuments({
        patientId,
        score: { $gte: 80 },
        exerciseId, // weak proxy — for hackathon
      });
      if (phonemeHighCount >= (c.threshold ?? 3)) unlocked = true;
    }
    if (unlocked) newlyUnlocked.push(a.code);
  }
  return newlyUnlocked;
}
