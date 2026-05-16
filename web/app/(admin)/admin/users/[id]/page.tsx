"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  Calendar,
  ClipboardList,
  Flame,
  MessageCircle,
  Phone,
  RotateCcw,
  Trash2,
  Trophy,
  User as UserIcon,
  Stethoscope,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { formatRelative } from "@/lib/utils";

type Detail = Awaited<ReturnType<typeof api.adminUserDetail>>;
type Doctor = Awaited<ReturnType<typeof api.adminAssignments>>["doctors"][number];

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  // Doctor list + pending selection for the assign-therapist control (patient view only)
  const [doctors, setDoctors] = useState<Doctor[] | null>(null);
  const [pendingDoctorId, setPendingDoctorId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  async function load() {
    try {
      const d = await api.adminUserDetail(params.id);
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  useEffect(() => {
    load();
  }, [params.id]);

  // Lazy-load the approved-doctor list only when viewing a patient — that's
  // the only role where the assign-therapist control is shown.
  useEffect(() => {
    if (data?.role === "patient" && doctors === null) {
      api.adminAssignments()
        .then((d) => {
          setDoctors(d.doctors);
          setPendingDoctorId(data.patient?.assignedDoctorId ?? "");
        })
        .catch(() => {
          /* leave doctors null — UI shows empty fallback */
        });
    }
  }, [data, doctors]);

  async function saveAssignment() {
    if (!data) return;
    setAssigning(true);
    try {
      const next = pendingDoctorId === "" ? null : pendingDoctorId;
      await api.adminAssignPatient(data.id, next);
      toast({
        title: next ? "Therapist assigned" : "Therapist removed",
        variant: "success",
      });
      // Refresh detail so the patient.assignedDoctorId reflects the new value
      await load();
    } catch (e) {
      toast({
        title: "Could not update assignment",
        description: e instanceof Error ? e.message : String(e),
        variant: "error",
      });
    } finally {
      setAssigning(false);
    }
  }

  async function toggleSuspend() {
    if (!data) return;
    try {
      await api.adminSuspend(data.id, !data.suspended);
      toast({
        title: `${!data.suspended ? "Suspended" : "Reinstated"} ${data.name}`,
        variant: "success",
      });
      load();
    } catch (e) {
      toast({ title: "Could not update", description: String(e), variant: "error" });
    }
  }

  async function performDelete() {
    if (!data) return;
    setBusy(true);
    try {
      await api.adminDeleteUser(data.id);
      toast({
        title: `Deleted ${data.name}`,
        description: "All related data has been removed.",
        variant: "success",
      });
      router.replace("/admin/users");
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "error",
      });
      setBusy(false);
    }
  }

  if (error)
    return (
      <Card>
        <p className="text-rose-600">{error}</p>
      </Card>
    );
  if (!data)
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size={28} />
      </div>
    );

  const RoleIcon =
    data.role === "patient" ? UserIcon : data.role === "doctor" ? Stethoscope : ShieldCheck;

  return (
    <div className="flex flex-col gap-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="self-start"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to users
      </Button>

      {/* Header card */}
      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-white flex items-center justify-center shrink-0">
              <RoleIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl text-ink-900 dark:text-ink-100 mb-1">
                {data.name}
              </h1>
              <p className="text-sm text-ink-600 dark:text-ink-400 mb-2">{data.email}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={
                    data.role === "admin" ? "primary" : data.role === "doctor" ? "info" : "muted"
                  }
                >
                  {data.role}
                </Badge>
                {data.suspended ? (
                  <Badge variant="danger">suspended</Badge>
                ) : (
                  <Badge variant="success">active</Badge>
                )}
                <span className="text-xs text-ink-500 dark:text-ink-400">
                  joined {formatRelative(data.createdAt)}
                </span>
              </div>
            </div>
          </div>
          {data.role !== "admin" && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={toggleSuspend}>
                {data.suspended ? (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Reinstate
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    Suspend
                  </>
                )}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Activity counts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatTile
          label="Recording attempts"
          value={data.activity.scoreCount}
          icon={<Trophy className="w-5 h-5" />}
        />
        <StatTile
          label="Assignments"
          value={data.activity.assignmentCount}
          icon={<ClipboardList className="w-5 h-5" />}
        />
        <StatTile
          label="Chat threads"
          value={data.activity.chatCount}
          icon={<MessageCircle className="w-5 h-5" />}
        />
      </div>

      {/* Patient details */}
      {data.patient && (
        <Card>
          <CardHeader
            title="Patient profile"
            subtitle="Personal info and practice metrics"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <Field label="Age" value={data.patient.age !== null ? `${data.patient.age} years` : "—"} icon={<Calendar className="w-3.5 h-3.5" />} />
            <Field label="Phone" value={data.patient.phone || "—"} icon={<Phone className="w-3.5 h-3.5" />} />
            <Field label="Language" value={data.patient.language === "en" ? "English" : "हिन्दी"} />
            <Field label="Onboarding" value={data.patient.onboardingComplete ? "Complete" : "In progress"} />
            <Field label="XP" value={data.patient.xp.toLocaleString()} />
            <Field label="Coins" value={data.patient.coins.toLocaleString()} icon={<Trophy className="w-3.5 h-3.5 text-gold-500" />} />
            <Field label="Streak" value={`${data.patient.streakDays} day${data.patient.streakDays === 1 ? "" : "s"}`} icon={<Flame className="w-3.5 h-3.5 text-coral-500" />} />
            <Field label="Plan" value={data.patient.subscriptionStatus} />
            <Field
              label="Trial ends"
              value={data.patient.trialEndsAt ? formatRelative(data.patient.trialEndsAt) : "—"}
            />
            <Field
              label="Last practiced"
              value={data.patient.lastPracticedAt ? formatRelative(data.patient.lastPracticedAt) : "Never"}
            />
            <Field
              label="Therapist assigned"
              value={data.patient.assignedDoctorId ? "Yes" : "No"}
            />
            <Field
              label="Badges unlocked"
              value={`${data.patient.unlockedBadges.length}`}
            />
          </div>
          {data.patient.conditions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-ink-200 dark:border-ink-700">
              <p className="text-xs uppercase tracking-wider text-ink-500 dark:text-ink-400 font-semibold mb-2">
                Conditions
              </p>
              <div className="flex flex-wrap gap-2">
                {data.patient.conditions.map((c) => (
                  <Badge key={c} variant="muted">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Assign / change therapist control (patient role only) */}
          <div className="mt-4 pt-4 border-t border-ink-200 dark:border-ink-700">
            <p className="text-xs uppercase tracking-wider text-ink-500 dark:text-ink-400 font-semibold mb-2 flex items-center gap-1">
              <Stethoscope className="w-3.5 h-3.5" />
              Assigned therapist
            </p>
            {doctors === null ? (
              <p className="text-sm text-ink-500 dark:text-ink-400">Loading therapists…</p>
            ) : doctors.length === 0 ? (
              <p className="text-sm text-ink-500 dark:text-ink-400">
                No approved therapists available. Approve a doctor in Applications first.
              </p>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={pendingDoctorId}
                  onChange={(e) => setPendingDoctorId(e.target.value)}
                  className="rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 px-3 py-2 text-sm text-ink-900 dark:text-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 flex-1 min-w-[240px]"
                  disabled={assigning}
                >
                  <option value="">— Unassigned —</option>
                  {doctors.map((d) => (
                    <option key={d.userId} value={d.userId}>
                      {d.name}
                      {d.specialization ? ` · ${d.specialization}` : ""} · {d.rosterCount}{" "}
                      patient{d.rosterCount === 1 ? "" : "s"}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  onClick={saveAssignment}
                  disabled={
                    assigning || pendingDoctorId === (data.patient?.assignedDoctorId ?? "")
                  }
                  loading={assigning}
                >
                  Save assignment
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Doctor details */}
      {data.doctor && (
        <Card>
          <CardHeader
            title="Therapist profile"
            subtitle="Credentials and application status"
          />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <Field label="Full name" value={data.doctor.fullName} />
            <Field label="Phone" value={data.doctor.phone || "—"} icon={<Phone className="w-3.5 h-3.5" />} />
            <Field label="Specialization" value={data.doctor.specialization || "—"} />
            <Field label="Qualification" value={data.doctor.qualification || "—"} />
            <Field label="License #" value={data.doctor.license || "—"} />
            <Field label="Experience" value={`${data.doctor.experienceYears} years`} />
            <Field label="Clinic" value={data.doctor.clinicName || "—"} />
            <Field
              label="LinkedIn"
              value={
                data.doctor.linkedinUrl ? (
                  <a
                    href={data.doctor.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-600 dark:text-brand-400 hover:underline truncate inline-block max-w-full"
                  >
                    profile ↗
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <Field label="Application status" value={<Badge variant={data.doctor.status === "approved" ? "success" : data.doctor.status === "pending" ? "warning" : data.doctor.status === "rejected" ? "danger" : "muted"}>{data.doctor.status}</Badge>} />
            <Field label="Rating" value={data.doctor.rating !== null ? `${data.doctor.rating.toFixed(1)} ★` : "—"} />
            <Field label="Submitted" value={data.doctor.submittedAt ? formatRelative(data.doctor.submittedAt) : "—"} />
            <Field label="Approved" value={data.doctor.approvedAt ? formatRelative(data.doctor.approvedAt) : "—"} />
            <Field label="Rejected" value={data.doctor.rejectedAt ? formatRelative(data.doctor.rejectedAt) : "—"} />
          </div>
          {data.doctor.bio && (
            <div className="mt-4 pt-4 border-t border-ink-200 dark:border-ink-700">
              <p className="text-xs uppercase tracking-wider text-ink-500 dark:text-ink-400 font-semibold mb-1">
                Bio
              </p>
              <p className="text-sm text-ink-700 dark:text-ink-300 whitespace-pre-wrap">
                {data.doctor.bio}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={() => !busy && setConfirmDelete(false)}
        >
          <div
            className="bg-white dark:bg-ink-900 rounded-2xl shadow-lift border border-ink-200 dark:border-ink-700 p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader
              title={
                <span className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="w-5 h-5" />
                  Delete {data.name}?
                </span>
              }
              subtitle="This permanently removes the account and all related data."
            />
            <p className="text-xs text-rose-700 dark:text-rose-400 mb-4 font-semibold">
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="danger" onClick={performDelete} loading={busy}>
                <Trash2 className="w-4 h-4" />
                Yes, delete permanently
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-ink-500 dark:text-ink-400 font-semibold">
          {label}
        </p>
        <p className="font-display text-2xl text-ink-900 dark:text-ink-100">{value}</p>
      </div>
    </Card>
  );
}

function Field({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-ink-500 dark:text-ink-400 font-semibold mb-0.5 flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="text-sm text-ink-900 dark:text-ink-100 font-medium">{value || "—"}</p>
    </div>
  );
}
