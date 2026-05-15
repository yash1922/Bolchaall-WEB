import "dotenv/config";
import { connectDB, disconnectDB } from "../lib/db";
import { hashPassword } from "../auth/passwords";
import { User } from "../models/User";
import { Patient } from "../models/Patient";
import { DoctorProfile } from "../models/DoctorProfile";
import { PhonemeWord } from "../models/PhonemeWord";
import { Exercise } from "../models/Exercise";
import { Achievement } from "../models/Achievement";
import { Assignment } from "../models/Assignment";
import { Score } from "../models/Score";
import { Chat } from "../models/Chat";
import { Message } from "../models/Message";
import { RefreshToken } from "../models/RefreshToken";
import phonemes from "./data/phonemes.json";
import exercises from "./data/exercises.json";
import achievements from "./data/achievements.json";

async function run() {
  await connectDB();

  const includeDemoUsers = String(process.env.BOLCHALL_INCLUDE_DEMO_USERS).toLowerCase() === "true";
  const demoPassword = process.env.DEMO_ACCOUNT_PASSWORD ?? "Bolchall@2026";

  // Resolve demo emails up-front so we can scope the wipe to only those accounts.
  const adminEmail = (process.env.DEMO_ADMIN_EMAIL ?? "admin@bolchall.demo").toLowerCase();
  const drApproved1Email = (process.env.DEMO_DOCTOR_APPROVED_1_EMAIL ?? "dr.priya@bolchall.demo").toLowerCase();
  const drApproved2Email = (process.env.DEMO_DOCTOR_APPROVED_2_EMAIL ?? "dr.raj@bolchall.demo").toLowerCase();
  const drPendingEmail = (process.env.DEMO_DOCTOR_PENDING_EMAIL ?? "dr.pending@bolchall.demo").toLowerCase();
  const patientPaidEmail = (process.env.DEMO_PATIENT_PAID_EMAIL ?? "patient.sara@bolchall.demo").toLowerCase();
  const patientTrialEmail = (process.env.DEMO_PATIENT_TRIAL_EMAIL ?? "patient.alex@bolchall.demo").toLowerCase();
  const demoEmails = [
    adminEmail,
    drApproved1Email,
    drApproved2Email,
    drPendingEmail,
    patientPaidEmail,
    patientTrialEmail,
  ];

  console.log("[seed] wiping existing content data + demo-only user accounts…");
  // Always wipe content tables (phonemes, exercises, achievements) — these are static seed data.
  const wipeOps: Promise<unknown>[] = [
    PhonemeWord.deleteMany({}).exec(),
    Exercise.deleteMany({ isGlobal: true }).exec(), // keep therapist-created exercises
    Achievement.deleteMany({}).exec(),
  ];

  if (includeDemoUsers) {
    // Targeted wipe: only delete the demo email accounts + their cascading records.
    // ANY user account you signed up yourself is preserved across reseeds.
    const demoUsers = await User.find({ email: { $in: demoEmails } }).select("_id").lean();
    const demoUserIds = demoUsers.map((u) => u._id);
    wipeOps.push(
      User.deleteMany({ email: { $in: demoEmails } }).exec(),
      Patient.deleteMany({ userId: { $in: demoUserIds } }).exec(),
      DoctorProfile.deleteMany({ userId: { $in: demoUserIds } }).exec(),
      Assignment.deleteMany({
        $or: [{ patientId: { $in: demoUserIds } }, { doctorId: { $in: demoUserIds } }],
      }).exec(),
      Score.deleteMany({ patientId: { $in: demoUserIds } }).exec(),
      Chat.deleteMany({
        $or: [{ patientId: { $in: demoUserIds } }, { doctorId: { $in: demoUserIds } }],
      }).exec(),
      Message.deleteMany({ senderId: { $in: demoUserIds } }).exec(),
      RefreshToken.deleteMany({ userId: { $in: demoUserIds } }).exec()
    );
  }
  await Promise.all(wipeOps);

  console.log("[seed] inserting phonemes, exercises, achievements…");
  await PhonemeWord.insertMany(phonemes);
  await Exercise.insertMany(
    exercises.map((e) => ({
      ...e,
      isGlobal: true,
      setName: e.setName ?? "Warm-up",
      setOrder: e.setOrder ?? 0,
      tier: (e as { tier?: string }).tier ?? "beginner",
    }))
  );
  await Achievement.insertMany(achievements);

  if (!includeDemoUsers) {
    console.log("[seed] skipping demo user creation (BOLCHALL_INCLUDE_DEMO_USERS != true).");
    console.log("[seed] To bootstrap an admin: pnpm create-admin <email> <name> <password>");
    await disconnectDB();
    process.exit(0);
  }

  console.log("[seed] creating demo accounts (BOLCHALL_INCLUDE_DEMO_USERS=true)…");
  console.log("[seed] (any non-demo accounts you signed up are preserved.)");
  const passwordHash = await hashPassword(demoPassword);

  const admin = await User.create({
    email: adminEmail,
    name: "Asha Admin",
    role: "admin",
    passwordHash,
  });

  const drPriya = await User.create({
    email: drApproved1Email,
    name: "Dr. Priya Sharma",
    role: "doctor",
    passwordHash,
  });
  await DoctorProfile.create({
    userId: drPriya._id,
    fullName: "Dr. Priya Sharma",
    phone: "+91 90000 11111",
    qualification: "MASLP",
    specialization: "Adult stroke recovery + pediatric articulation",
    license: "SLP-IN-2018-4421",
    certifications: ["MASLP", "ASHA-CCC-SLP"],
    experienceYears: 8,
    bio: "Speech-language pathologist focused on adult stroke recovery and pediatric articulation.",
    status: "approved",
    submittedAt: new Date(),
    approvedAt: new Date(),
    rating: 4.9,
  });

  const drRaj = await User.create({
    email: drApproved2Email,
    name: "Dr. Raj Mehta",
    role: "doctor",
    passwordHash,
  });
  await DoctorProfile.create({
    userId: drRaj._id,
    fullName: "Dr. Raj Mehta",
    phone: "+91 90000 22222",
    qualification: "MASLP",
    specialization: "Bilingual fluency + accent modification",
    license: "SLP-IN-2020-7891",
    certifications: ["MASLP"],
    experienceYears: 5,
    bio: "Bilingual SLP (English/Hindi) — fluency disorders and accent modification.",
    status: "approved",
    submittedAt: new Date(),
    approvedAt: new Date(),
    rating: 4.7,
  });

  const drPending = await User.create({
    email: drPendingEmail,
    name: "Dr. Sam Nair",
    role: "doctor",
    passwordHash,
  });
  await DoctorProfile.create({
    userId: drPending._id,
    fullName: "Dr. Sam Nair",
    phone: "+91 90000 33333",
    qualification: "BASLP",
    specialization: "Articulation disorders",
    license: "SLP-IN-2024-0001",
    certifications: ["BASLP"],
    experienceYears: 1,
    bio: "Recently graduated, awaiting platform approval.",
    status: "pending",
    submittedAt: new Date(),
  });

  // Patient Alex — trial, assigned to Priya (auto-trial-therapist demo)
  const userAlex = await User.create({
    email: patientTrialEmail,
    name: "Alex Rivera",
    role: "patient",
    passwordHash,
  });
  await Patient.create({
    userId: userAlex._id,
    language: "en",
    conditions: ["stroke recovery"],
    xp: 240,
    coins: 180,
    streakDays: 3,
    lastPracticedAt: new Date(),
    unlockedBadges: ["first_step", "on_fire_3"],
    subscriptionStatus: "trial",
    trialEndsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    assignedDoctorId: drPriya._id,
    onboardingComplete: true,
  });

  // Patient Sara — paid plan, assigned to Raj (use this account to test premium features)
  const userSara = await User.create({
    email: patientPaidEmail,
    name: "Sara Khan",
    role: "patient",
    passwordHash,
  });
  await Patient.create({
    userId: userSara._id,
    language: "hi",
    conditions: ["articulation disorder"],
    xp: 1240,
    coins: 880,
    streakDays: 12,
    lastPracticedAt: new Date(),
    unlockedBadges: ["first_step", "on_fire_3", "on_fire_7", "ace_5", "master_s"],
    subscriptionStatus: "active",
    trialEndsAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
    assignedDoctorId: drRaj._id,
    onboardingComplete: true,
  });

  const allExercises = await Exercise.find().lean();
  const sExercise = allExercises.find((e) => e.targetPhonemes.includes("/s/"));
  if (sExercise) {
    const seedScores = [72, 78, 85, 81, 90, 88, 92, 87, 94, 91];
    const now = Date.now();
    await Score.insertMany(
      seedScores.map((sc, i) => ({
        patientId: userSara._id,
        exerciseId: sExercise._id,
        score: sc,
        selfRating: 4,
        createdAt: new Date(now - (seedScores.length - i) * 24 * 60 * 60 * 1000),
      }))
    );
  }

  await Chat.create({ patientId: userAlex._id, doctorId: drPriya._id });
  await Chat.create({ patientId: userSara._id, doctorId: drRaj._id });

  if (allExercises[0]) {
    await Assignment.create({
      patientId: userAlex._id,
      doctorId: drPriya._id,
      exerciseId: allExercises[0]._id,
      dueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      note: "Start here — daily practice for the next 5 days.",
    });
  }

  // ---- Demo: Dr. Priya authors a CUSTOM exercise and assigns it to Sara ----
  // Demonstrates the therapist-creates-exercise + therapist-reviews-recording loop.
  // The 1 attempt below is intentionally left UNREVIEWED so testers see the
  // doctor inbox light up with a "needs review" item.
  const priyaCustomExercise = await Exercise.create({
    title: "Dr. Priya's /sh/ minimal pairs",
    description:
      "Custom drill from your therapist — perception + production for the /sh/ vs /s/ contrast.",
    targetPhonemes: ["/sh/", "/s/"],
    type: "production",
    difficulty: "medium",
    items: [
      { prompt: "Say it slowly", targetWord: "sheep" },
      { prompt: "Say it slowly", targetWord: "ship" },
      { prompt: "Say it slowly", targetWord: "shore" },
      { prompt: "Say it slowly", targetWord: "shoe" },
    ],
    audioRefUrl: null,
    isGlobal: false, // therapist-authored, NOT in the public library
    setName: "Dr. Priya — Custom",
    setOrder: 1,
    tier: "intermediate",
    createdById: drPriya._id,
  });

  const saraCustomAssignment = await Assignment.create({
    patientId: userSara._id,
    doctorId: drPriya._id,
    exerciseId: priyaCustomExercise._id,
    dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    note: "Sara — focus on the /sh/ vs /s/ contrast this week. Submit at least 4 attempts.",
    completedAt: new Date(Date.now() - 60 * 60 * 1000), // pretend she finished an hour ago
    // therapistFeedback / therapistManualScore intentionally LEFT EMPTY so the
    // doctor's inbox shows a "needs review" item.
  });

  // Also create a chat thread between Sara and Priya so the new therapist
  // relationship has a place to live (Sara is currently with Raj — but for
  // the demo flow we model Priya as also being involved on this exercise).
  await Score.create({
    patientId: userSara._id,
    exerciseId: priyaCustomExercise._id,
    assignmentId: saraCustomAssignment._id,
    score: 78,
    selfRating: 4,
    audioUrl: null,
  });

  void admin;

  console.log(`[seed] done. demo password: ${demoPassword}`);
  console.log(
    `[seed] accounts: ${adminEmail} · ${drApproved1Email} · ${drApproved2Email} · ${drPendingEmail} · ${patientTrialEmail} · ${patientPaidEmail} (paid)`
  );
  await disconnectDB();
  process.exit(0);
}

run().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
