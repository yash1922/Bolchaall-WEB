import { Patient } from "../models/Patient";
import { DoctorProfile } from "../models/DoctorProfile";
import { Chat } from "../models/Chat";

/**
 * Pick the approved doctor with the smallest active roster and assign them
 * as the trial-period therapist for the given patient.
 *
 * Also ensures a Chat row exists for the new (patient, doctor) pair so the
 * chat appears immediately in both inboxes.
 *
 * Returns the assigned doctor's userId or null if no approved doctor exists.
 */
export async function assignTrialTherapist(patientUserId: string): Promise<string | null> {
  const profiles = await DoctorProfile.find({ status: "approved" }).select("userId").lean();
  if (profiles.length === 0) return null;

  const counts = await Promise.all(
    profiles.map(async (d) => ({
      userId: d.userId,
      count: await Patient.countDocuments({ assignedDoctorId: d.userId }),
    }))
  );
  counts.sort((a, b) => a.count - b.count);
  const pickedDoctorId = counts[0]!.userId;

  const result = await Patient.updateOne(
    { userId: patientUserId, assignedDoctorId: null },
    { $set: { assignedDoctorId: pickedDoctorId } }
  );

  // Only create the chat if we actually changed the assignment (avoids
  // dupes if this gets called twice). The unique compound index on
  // (patientId, doctorId) also prevents duplicates as a safety net.
  if (result.modifiedCount > 0) {
    try {
      await Chat.create({ patientId: patientUserId, doctorId: pickedDoctorId });
    } catch (e) {
      // E11000 = duplicate key — a chat already exists for this pair, fine.
      const code = (e as { code?: number }).code;
      if (code !== 11000) throw e;
    }
  }
  return String(pickedDoctorId);
}

/**
 * If the patient's trial expired AND they're not on a paid plan, drop the
 * auto-assigned therapist. They'll need to subscribe to retain a therapist.
 *
 * Idempotent — call this on every authenticated patient request that touches
 * patient data. Returns true if the assignment was just revoked.
 */
export async function revokeExpiredTrialAssignment(patientUserId: string): Promise<boolean> {
  const patient = await Patient.findOne({ userId: patientUserId }).select(
    "subscriptionStatus trialEndsAt assignedDoctorId"
  );
  if (!patient) return false;
  if (!patient.assignedDoctorId) return false;
  if (patient.subscriptionStatus === "active") return false;
  if (!patient.trialEndsAt) return false;
  if (patient.trialEndsAt.getTime() > Date.now()) return false;

  patient.assignedDoctorId = null;
  await patient.save();
  return true;
}
