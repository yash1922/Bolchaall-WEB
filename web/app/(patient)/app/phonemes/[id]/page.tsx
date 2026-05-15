"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Mic, Sparkles, Star, Volume2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge, DifficultyBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { MouthDiagram } from "@/components/phonemes/MouthDiagram";
import { AudioRecorder, type ScoreBreakdown } from "@/components/shared/AudioRecorder";
import { ScoreBreakdownCard } from "@/components/patient/ScoreBreakdownCard";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store";
import { playApplause } from "@/lib/sounds";
import type { ExerciseDTO, PhonemeWordDTO, ScoreDTO } from "shared";
import { cn } from "@/lib/utils";

export default function PhonemeDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const patchPatient = useAuthStore((s) => s.patchPatient);

  const [p, setP] = useState<PhonemeWordDTO | null>(null);
  const [exercises, setExercises] = useState<ExerciseDTO[]>([]);
  const [pastScores, setPastScores] = useState<ScoreDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [lastBreakdown, setLastBreakdown] = useState<ScoreBreakdown | null>(null);
  const [sessionAttempts, setSessionAttempts] = useState(0);
  const [recorderKey, setRecorderKey] = useState(0); // bump to reset recorder after submission
  const recorderTopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Fetch phoneme detail + global exercise library + past attempts in parallel
        const [phoneme, allExercises, allScores] = await Promise.all([
          api.getPhoneme(params.id),
          api.listExercises().catch(() => []),
          api.patientScores().catch(() => []),
        ]);
        if (cancelled) return;
        setP(phoneme);
        // Auto-select the first sample word for fastest "record now" experience
        if (phoneme.sampleWords.length > 0) setSelectedWord(phoneme.sampleWords[0] ?? null);
        // Match exercises that target this phoneme
        const matching = allExercises.filter((ex) => ex.targetPhonemes.includes(phoneme.ipa));
        setExercises(matching);
        // Past scores tied to ANY of the matching exercises = the patient's history on this phoneme
        const matchingIds = new Set(matching.map((ex) => ex.id));
        setPastScores(allScores.filter((s) => matchingIds.has(s.exerciseId)));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load phoneme");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const targetExercise = exercises[0] ?? null;

  const stats = useMemo(() => {
    if (pastScores.length === 0) return { attempts: 0, best: null as number | null, avg: null as number | null };
    const best = Math.max(...pastScores.map((s) => s.score));
    const avg = Math.round(pastScores.reduce((a, s) => a + s.score, 0) / pastScores.length);
    return { attempts: pastScores.length, best, avg };
  }, [pastScores]);

  if (error)
    return (
      <Card>
        <p className="text-rose-600 dark:text-rose-300">{error}</p>
      </Card>
    );
  if (!p)
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size={28} />
      </div>
    );

  function speakWord(word: string) {
    if (typeof window === "undefined") return;
    const u = new SpeechSynthesisUtterance(word);
    u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  async function handleScored(result: {
    score: number;
    mfccMean: number[];
    blob: Blob;
    breakdown: ScoreBreakdown;
  }) {
    // Always show the breakdown — even on score 0 — so the user sees WHY.
    setLastScore(result.score);
    setLastBreakdown(result.breakdown);
    setSessionAttempts((n) => n + 1);

    if (result.score === 0) {
      toast({
        title: "Score: 0 — no speech detected",
        description: "Check your mic, then try again. We need to hear the word clearly.",
        variant: "error",
      });
      setRecorderKey((k) => k + 1);
      return;
    }

    if (!targetExercise) {
      toast({
        title: `Score: ${result.score}/100 (preview only)`,
        description:
          "No exercise is linked to this phoneme yet, so we can't save XP. The breakdown below shows what we measured.",
        variant: "info",
      });
      return;
    }
    setSubmitting(true);
    try {
      const r = await api.submitScore({
        exerciseId: targetExercise.id,
        score: result.score,
        selfRating: null,
        mfccVector: result.mfccMean.length > 0 ? result.mfccMean : undefined,
      });
      // Optimistically append to local history so per-phoneme stats update without a refetch
      setPastScores((prev) => [
        ...prev,
        {
          id: r.score.id,
          exerciseId: r.score.exerciseId,
          patientId: r.score.patientId,
          score: r.score.score,
          selfRating: r.score.selfRating,
          createdAt: r.score.createdAt,
        } as ScoreDTO,
      ]);
      patchPatient({ xp: r.totalXp, coins: r.totalCoins, streakDays: r.streakDays });
      toast({
        title: `Saved! ${result.score}/100 — +${r.xpGained} XP, +${r.coinsGained} coins`,
        description:
          r.newlyUnlockedBadges.length > 0
            ? `Unlocked: ${r.newlyUnlockedBadges.join(", ")}`
            : "Recording captured. Try a few more for a stronger average.",
        variant: "success",
      });
      if (result.score >= 80) playApplause("loud");
      else if (result.score >= 60) playApplause("soft");
      // Reset recorder so the user can immediately record another attempt
      setRecorderKey((k) => k + 1);
    } catch (e) {
      toast({
        title: "Could not save score",
        description: e instanceof Error ? e.message : String(e),
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function jumpToRecorder() {
    recorderTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="self-start">
        <ArrowLeft className="w-4 h-4" />
        Back to directory
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-baseline gap-4 mb-2 flex-wrap">
          <span className="font-mono text-5xl text-ink-900 dark:text-ink-100">{p.ipa}</span>
          <span className="font-display text-3xl text-ink-900 dark:text-ink-100">{p.label}</span>
          <Badge variant={p.language === "en" ? "primary" : "info"}>
            {p.language === "en" ? "English" : "Hindi"}
          </Badge>
          {p.voicing && <Badge variant="success">voiced</Badge>}
        </div>
        <p className="text-sm text-ink-500 dark:text-ink-400">{p.category}</p>
      </motion.div>

      {/* Per-phoneme stats banner — only render when there's something to show */}
      {stats.attempts > 0 && (
        <Card className="bg-brand-50 dark:bg-brand-950 border-brand-200 dark:border-brand-800">
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-wider text-brand-700 dark:text-brand-300 font-semibold mb-1">
                Your progress on /{p.ipa}/
              </p>
              <p className="text-sm text-ink-700 dark:text-ink-300">
                {stats.attempts} attempt{stats.attempts === 1 ? "" : "s"} — best{" "}
                <span className="font-semibold text-ink-900 dark:text-ink-100">{stats.best}/100</span>
                {stats.avg !== null && (
                  <>
                    , average{" "}
                    <span className="font-semibold text-ink-900 dark:text-ink-100">{stats.avg}/100</span>
                  </>
                )}
              </p>
            </div>
            <Button onClick={jumpToRecorder} variant="primary">
              <Mic className="w-4 h-4" />
              Record again
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Articulation" subtitle="Tongue, lips, voicing" />
          <MouthDiagram
            tonguePosition={p.tonguePosition}
            lipShape={p.lipShape}
            voicing={p.voicing}
            className="w-full max-w-md mx-auto"
          />
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg bg-ink-100 dark:bg-ink-800 border border-ink-200 dark:border-ink-700 p-2">
              <p className="uppercase tracking-wider text-ink-500 dark:text-ink-400">Place</p>
              <p className="text-ink-900 dark:text-ink-100 mt-0.5">{p.place || "—"}</p>
            </div>
            <div className="rounded-lg bg-ink-100 dark:bg-ink-800 border border-ink-200 dark:border-ink-700 p-2">
              <p className="uppercase tracking-wider text-ink-500 dark:text-ink-400">Manner</p>
              <p className="text-ink-900 dark:text-ink-100 mt-0.5">{p.manner || "—"}</p>
            </div>
            <div className="rounded-lg bg-ink-100 dark:bg-ink-800 border border-ink-200 dark:border-ink-700 p-2">
              <p className="uppercase tracking-wider text-ink-500 dark:text-ink-400">Tongue</p>
              <p className="text-ink-900 dark:text-ink-100 mt-0.5 capitalize">{p.tonguePosition}</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="How to say it" />
          <p className="text-sm text-ink-700 dark:text-ink-200 leading-relaxed mb-6">{p.articulationTip}</p>

          <CardHeader title="Sample words" subtitle="Pick a word, then tap Start recording below" />
          <div className="flex flex-wrap gap-2">
            {p.sampleWords.map((w) => {
              const isSelected = selectedWord === w;
              return (
                <button
                  key={w}
                  onClick={() => {
                    setSelectedWord(w);
                    speakWord(w);
                    setRecorderKey((k) => k + 1); // reset recorder when switching words
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition border-2",
                    isSelected
                      ? "bg-brand-500 text-white border-brand-600 shadow-soft"
                      : "bg-white dark:bg-ink-900 border-ink-200 dark:border-ink-700 text-ink-800 dark:text-ink-200 hover:border-brand-400"
                  )}
                  aria-pressed={isSelected}
                >
                  <Volume2 className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
                  {w}
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Inline recorder — the heart of "practice on this page" */}
      <div ref={recorderTopRef} />
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              Record yourself saying {selectedWord ? `"${selectedWord}"` : "the word"}
            </span>
          }
          subtitle={
            targetExercise
              ? "Each attempt is scored 0–100 using MFCC analysis and saved to your progress."
              : "No scoring exercise found for this phoneme yet — your recording will play back but won't be saved."
          }
        />

        {!selectedWord && (
          <p className="text-sm text-ink-500 dark:text-ink-400 mb-3">
            Pick a sample word above first.
          </p>
        )}

        <AudioRecorder
          key={recorderKey}
          onScored={handleScored}
          maxDurationMs={4000}
          resetKey={`${selectedWord}-${recorderKey}`}
        />

        {submitting && (
          <p className="text-sm text-ink-600 dark:text-ink-300 mt-3 text-center">
            Saving your score…
          </p>
        )}

        {lastScore !== null && lastBreakdown && !submitting && (
          <div className="mt-4">
            <ScoreBreakdownCard
              score={lastScore}
              breakdown={lastBreakdown}
              caption={`Attempt ${sessionAttempts} this session`}
            />
          </div>
        )}
      </Card>

      {/* Full multi-step exercises that target this phoneme */}
      {exercises.length > 0 && (
        <Card>
          <CardHeader
            title="Full exercises for this sound"
            subtitle="Multi-step drills with both perception (listen + pick) and production (record) practice."
            action={<Badge variant="primary">{exercises.length}</Badge>}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {exercises.map((ex) => (
              <Link
                key={ex.id}
                href={`/app/exercise/${ex.id}`}
                className="group rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 p-4 hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-ink-800 transition flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base text-ink-900 dark:text-ink-100 truncate">
                    {ex.title}
                  </p>
                  <p className="text-xs text-ink-600 dark:text-ink-400 mt-0.5 line-clamp-2">
                    {ex.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <DifficultyBadge level={ex.difficulty} />
                    <Badge variant="info" className="capitalize">
                      {ex.type}
                    </Badge>
                    <span className="text-xs text-ink-500">{ex.items.length} items</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-ink-400 group-hover:text-brand-500 transition shrink-0 mt-1" />
              </Link>
            ))}
          </div>
        </Card>
      )}

      {exercises.length === 0 && (
        <Card className="bg-ink-50 dark:bg-ink-900/40 border-ink-200 dark:border-ink-700">
          <p className="text-sm text-ink-600 dark:text-ink-400 text-center py-2">
            <Sparkles className="w-4 h-4 inline -mt-0.5 mr-1 text-brand-500" />
            No structured exercises target this phoneme yet — your therapist may add some, or use the
            free practice library to build ear training.
          </p>
        </Card>
      )}
    </div>
  );
}
