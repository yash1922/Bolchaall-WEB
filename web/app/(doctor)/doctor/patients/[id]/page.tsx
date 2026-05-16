"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { Card, CardHeader, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ProgressChart } from "@/components/patient/ProgressChart";
import { api } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";

export default function PatientDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.doctorPatient>> | null>(null);
  const [exercises, setExercises] = useState<Awaited<ReturnType<typeof api.doctorExercises>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const [d, ex] = await Promise.all([api.doctorPatient(params.id), api.doctorExercises()]);
      setData(d);
      setExercises(ex);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function assign() {
    if (!picked) return;
    setSubmitting(true);
    try {
      await api.doctorAssign({ patientId: params.id, exerciseId: picked });
      toast({ title: "Exercise assigned", variant: "success" });
      setOpen(false);
      setPicked(null);
      load();
    } catch (e) {
      toast({
        title: "Could not assign",
        description: e instanceof Error ? e.message : String(e),
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (error)
    return (
      <Card>
        <p className="text-rose-300">{error}</p>
      </Card>
    );
  if (!data || !exercises)
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size={28} />
      </div>
    );

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="self-start">
        <ArrowLeft className="w-4 h-4" />
        Back to roster
      </Button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="font-display text-3xl text-ink-900 dark:text-ink-100">{data.patient.name}</h1>
          <p className="text-sm text-ink-600 dark:text-ink-400">{data.patient.email}</p>
          {/* Basic personal details: age + phone — surfaced so the therapist has
              full context at a glance without digging into the admin view. */}
          <div className="flex items-center gap-3 mt-2 text-sm text-ink-700 dark:text-ink-300 flex-wrap">
            {data.patient.age !== null && data.patient.age !== undefined && (
              <span className="inline-flex items-center gap-1">
                <span className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold">Age</span>
                <span className="font-medium">{data.patient.age} yrs</span>
              </span>
            )}
            {data.patient.phone && (
              <span className="inline-flex items-center gap-1">
                <span className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold">Phone</span>
                <a
                  href={`tel:${data.patient.phone}`}
                  className="font-medium text-brand-700 dark:text-brand-300 hover:underline"
                >
                  {data.patient.phone}
                </a>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant={data.patient.subscriptionStatus === "active" ? "success" : "warning"}>
              {data.patient.subscriptionStatus}
            </Badge>
            {data.patient.conditions.map((c) => (
              <Badge key={c} variant="muted">
                {c}
              </Badge>
            ))}
          </div>
        </div>
        <Button onClick={() => setOpen(true)}>
          <ClipboardList className="w-4 h-4" />
          Assign exercise
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Streak" value={`${data.patient.streakDays}d`} />
        <StatCard label="XP" value={data.patient.xp.toLocaleString()} />
        <StatCard label="Coins" value={data.patient.coins.toLocaleString()} />
      </div>

      <Card>
        <CardHeader title="Score history" subtitle={`${data.recentScores.length} attempts`} />
        <ProgressChart data={data.recentScores} />
      </Card>

      <Card>
        <CardHeader title="Assignments" />
        {data.assignments.length === 0 ? (
          <p className="text-sm text-cosmic-300/60 py-4 text-center">No assignments yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.assignments.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <div>
                  <p className="text-sm">{a.exerciseTitle}</p>
                  <p className="text-xs text-cosmic-300/60">
                    Assigned {formatDateTime(a.createdAt)}
                    {a.dueAt && ` · due ${formatDateTime(a.dueAt)}`}
                  </p>
                </div>
                <Badge variant={a.completedAt ? "success" : "warning"}>
                  {a.completedAt ? "completed" : "open"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={open} onOpenChange={setOpen} title="Assign exercise" description="Pick from the global library.">
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
          {exercises.map((ex) => (
            <button
              key={ex.id}
              onClick={() => setPicked(ex.id)}
              className={`text-left rounded-xl border p-3 transition ${
                picked === ex.id
                  ? "border-cosmic-400/50 bg-cosmic-500/15"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <p className="text-sm">{ex.title}</p>
              <p className="text-xs text-cosmic-300/60">
                {ex.type} · {ex.difficulty}
              </p>
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={assign} disabled={!picked} loading={submitting}>
            Assign
          </Button>
        </div>
      </Modal>
    </div>
  );
}
