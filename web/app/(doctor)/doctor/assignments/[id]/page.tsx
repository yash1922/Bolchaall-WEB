"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Save } from "lucide-react";
import { Card, CardHeader, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, DifficultyBadge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { formatDateTime, cn } from "@/lib/utils";

type Detail = Awaited<ReturnType<typeof api.doctorAssignmentDetail>>;

export default function DoctorAssignmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [manualScore, setManualScore] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const d = await api.doctorAssignmentDetail(params.id);
      setData(d);
      setFeedback(d.therapistFeedback ?? "");
      setManualScore(d.therapistManualScore);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function submit() {
    setSubmitting(true);
    try {
      await api.doctorSubmitFeedback(params.id, {
        feedback: feedback.trim(),
        manualScore: manualScore,
      });
      toast({ title: "Feedback saved", variant: "success" });
      await load();
    } catch (e) {
      toast({
        title: "Could not save",
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
        <p className="text-rose-600">{error}</p>
      </Card>
    );
  if (!data)
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size={28} />
      </div>
    );

  const meanAttempt =
    data.scores.length > 0
      ? Math.round(data.scores.reduce((s, x) => s + x.score, 0) / data.scores.length)
      : null;
  const bestAttempt =
    data.scores.length > 0 ? Math.max(...data.scores.map((s) => s.score)) : null;

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="self-start">
        <ArrowLeft className="w-4 h-4" />
        Back to inbox
      </Button>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="font-display text-3xl text-ink-900 dark:text-ink-100">
              {data.exercise.title}
            </h1>
            <DifficultyBadge
              level={data.exercise.difficulty as "easy" | "medium" | "hard"}
            />
            <Badge variant="primary">{data.exercise.type}</Badge>
            {data.reviewedAt ? (
              <Badge variant="success">reviewed</Badge>
            ) : data.completedAt ? (
              <Badge variant="warning">awaiting your review</Badge>
            ) : (
              <Badge variant="muted">not started</Badge>
            )}
          </div>
          <p className="text-sm text-ink-600 dark:text-ink-400">
            {data.patient.name} · {data.patient.email}
          </p>
          {data.completedAt && (
            <p className="text-xs text-ink-500 mt-1">
              Completed {formatDateTime(data.completedAt)}
              {data.reviewedAt && ` · Last reviewed ${formatDateTime(data.reviewedAt)}`}
            </p>
          )}
        </div>
      </motion.div>

      {data.exercise.targetPhonemes.length > 0 && (
        <Card>
          <CardHeader title="Exercise items" />
          <div className="flex flex-col gap-1">
            {data.exercise.items.map((it, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-ink-100 dark:bg-ink-800 px-3 py-1.5 text-sm"
              >
                <span className="text-ink-600 dark:text-ink-400">{it.prompt}</span>
                <span className="font-display text-ink-900 dark:text-ink-100">
                  {it.targetWord}
                </span>
                {it.altWord && (
                  <span className="text-xs text-ink-500">vs {it.altWord}</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Attempts" value={data.scores.length} />
        <StatCard
          label="Algorithm best"
          value={bestAttempt !== null ? bestAttempt : "—"}
          hint="Highest browser MFCC score"
        />
        <StatCard
          label="Algorithm mean"
          value={meanAttempt !== null ? meanAttempt : "—"}
          hint={`Across ${data.scores.length} attempts`}
        />
      </div>

      {data.scores.length > 0 && (
        <Card>
          <CardHeader title="Patient submissions" subtitle="Self-rated stars + algorithm score per attempt." />
          <div className="flex flex-col gap-2">
            {data.scores.map((s, i) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-500 font-mono w-12">#{i + 1}</span>
                  <div>
                    <p className="font-display text-xl text-brand-700 dark:text-brand-300">
                      {s.score}
                    </p>
                    <p className="text-[10px] text-ink-500">algorithm score</p>
                  </div>
                  {s.selfRating !== null && (
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, k) => (
                        <Star
                          key={k}
                          className={cn(
                            "w-3.5 h-3.5",
                            k < (s.selfRating ?? 0)
                              ? "text-gold-500 fill-gold-500"
                              : "text-ink-300"
                          )}
                        />
                      ))}
                    </div>
                  )}
                  {s.audioUrl && (
                    <a
                      href={s.audioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-700 dark:text-brand-300 hover:underline"
                    >
                      audio ↗
                    </a>
                  )}
                </div>
                <span className="text-xs text-ink-500">{formatDateTime(s.createdAt)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Your review"
          subtitle="The patient sees this on their assignments page."
        />
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-400 mb-2 block">
              Manual score (0–100, optional)
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={manualScore ?? 70}
                onChange={(e) => setManualScore(Number(e.target.value))}
                className="flex-1 max-w-md accent-brand-600"
              />
              <input
                type="number"
                min={0}
                max={100}
                value={manualScore ?? ""}
                placeholder="—"
                onChange={(e) => {
                  const v = e.target.value;
                  setManualScore(v === "" ? null : Math.max(0, Math.min(100, Number(v))));
                }}
                className="w-20 h-9 rounded-lg bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-700 px-2 text-center text-ink-900 dark:text-ink-100"
              />
              {manualScore !== null && (
                <button
                  type="button"
                  onClick={() => setManualScore(null)}
                  className="text-xs text-ink-500 hover:text-rose-500"
                >
                  clear
                </button>
              )}
            </div>
          </div>
          <div>
            <label
              htmlFor="feedback"
              className="text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-400 mb-2 block"
            >
              Written feedback
            </label>
            <textarea
              id="feedback"
              rows={5}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What did the patient do well? What should they focus on next?"
              className="w-full rounded-xl bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-700 px-3 py-2 text-sm text-ink-900 dark:text-ink-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button onClick={submit} loading={submitting}>
              <Save className="w-4 h-4" />
              {data.reviewedAt ? "Update feedback" : "Submit feedback"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
