import { Patient } from "../models/Patient";
import { DoctorProfile } from "../models/DoctorProfile";

/**
 * Pick the approved doctor with the smallest active roster and assign them
 * as the trial-period therapist for the given patient.
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

  await Patient.updateOne(
    { userId: patientUserId, assignedDoctorId: null },
    { $set: { assignedDoctorId: pickedDoctorId } }
  );
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
