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

const DEMO_PASSWORD = "Bolchall@2026";

async function run() {
  await connectDB();
  console.log("[seed] wiping existing data...");
  await Promise.all([
    User.deleteMany({}),
    Patient.deleteMany({}),
    DoctorProfile.deleteMany({}),
    PhonemeWord.deleteMany({}),
    Exercise.deleteMany({}),
    Achievement.deleteMany({}),
    Assignment.deleteMany({}),
    Score.deleteMany({}),
    Chat.deleteMany({}),
    Message.deleteMany({}),
    RefreshToken.deleteMany({}),
  ]);

  console.log("[seed] inserting phonemes, exercises, achievements...");
  await PhonemeWord.insertMany(phonemes);
  await Exercise.insertMany(
    exercises.map((e) => ({
      ...e,
      isGlobal: true,
      setName: e.setName ?? "Warm-up",
      setOrder: e.setOrder ?? 0,
    }))
  );
  await Achievement.insertMany(achievements);

  console.log("[seed] creating demo accounts...");
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const admin = await User.create({
    email: "admin@bolchall.demo",
    name: "Asha Admin",
    role: "admin",
    passwordHash,
  });

  const drPriya = await User.create({
    email: "dr.priya@bolchall.demo",
    name: "Dr. Priya Sharma",
    role: "doctor",
    passwordHash,
  });
  await DoctorProfile.create({
    userId: drPriya._id,
    license: "SLP-IN-2018-4421",
    certifications: ["MASLP", "ASHA-CCC-SLP"],
    experienceYears: 8,
    bio: "Speech-language pathologist focused on adult stroke recovery and pediatric articulation.",
    status: "approved",
    rating: 4.9,
  });

  const drRaj = await User.create({
    email: "dr.raj@bolchall.demo",
    name: "Dr. Raj Mehta",
    role: "doctor",
    passwordHash,
  });
  await DoctorProfile.create({
    userId: drRaj._id,
    license: "SLP-IN-2020-7891",
    certifications: ["MASLP"],
    experienceYears: 5,
    bio: "Bilingual SLP (English/Hindi) — fluency disorders and accent modification.",
    status: "approved",
    rating: 4.7,
  });

  const drPending = await User.create({
    email: "dr.pending@bolchall.demo",
    name: "Dr. Sam Nair",
    role: "doctor",
    passwordHash,
  });
  await DoctorProfile.create({
    userId: drPending._id,
    license: "SLP-IN-2024-0001",
    certifications: ["BASLP"],
    experienceYears: 1,
    bio: "Recently graduated, awaiting platform approval.",
    status: "pending",
  });

  // Patient Alex — trial, assigned to Priya
  const userAlex = await User.create({
    email: "patient.alex@bolchall.demo",
    name: "Alex Rivera",
    role: "patient",
    passwordHash,
  });
  const trialEndsAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
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
    trialEndsAt,
    assignedDoctorId: drPriya._id,
    onboardingComplete: true,
  });

  // Patient Sara — paid, assigned to Raj
  const userSara = await User.create({
    email: "patient.sara@bolchall.demo",
    name: "Sara Khan",
    role: "patient",
    passwordHash,
  });
  const paidEndsAt = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000);
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
    trialEndsAt: paidEndsAt,
    assignedDoctorId: drRaj._id,
    onboardingComplete: true,
  });

  // A few seeded scores for Sara so the chart isn't empty
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

  // Pre-create chats so demo flow is smooth
  await Chat.create({ patientId: userAlex._id, doctorId: drPriya._id });
  await Chat.create({ patientId: userSara._id, doctorId: drRaj._id });

  // One pre-assigned exercise for Alex
  if (allExercises[0]) {
    await Assignment.create({
      patientId: userAlex._id,
      doctorId: drPriya._id,
      exerciseId: allExercises[0]._id,
      dueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      note: "Start here — daily practice for the next 5 days.",
    });
  }

  void admin;

  console.log(`[seed] done. demo password: ${DEMO_PASSWORD}`);
  console.log("[seed] accounts: admin@bolchall.demo / dr.priya / dr.raj / dr.pending / patient.alex / patient.sara");
  await disconnectDB();
  process.exit(0);
}

run().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
