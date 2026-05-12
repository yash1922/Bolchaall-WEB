"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Volume2, Star, Sparkles } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, DifficultyBadge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { AudioRecorder } from "@/components/shared/AudioRecorder";
import { SpeakingCharacter } from "@/components/shared/SpeakingCharacter";
import { BadgeUnlockBurst } from "@/components/patient/BadgeUnlockBurst";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store";
import { playApplause, playChime } from "@/lib/sounds";
import type { ExerciseDTO } from "shared";
import { cn } from "@/lib/utils";

type Stage = "perception" | "production" | "summary";

export default function ExercisePlayer() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const patchPatient = useAuthStore((s) => s.patchPatient);

  const [ex, setEx] = useState<ExerciseDTO | null>(null);
  const [stage, setStage] = useState<Stage>("perception");
  const [perceptionUnlocked, setPerceptionUnlocked] = useState(false);
  const [perceptionIdx, setPerceptionIdx] = useState(0);
  const [perceptionRight, setPerceptionRight] = useState(0);
  const [productionIdx, setProductionIdx] = useState(0);
  const [lastResult, setLastResult] = useState<{
    score: number;
    selfRating: number | null;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selfRating, setSelfRating] = useState<number | null>(null);
  const [scoresSubmitted, setScoresSubmitted] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [unlockedBadge, setUnlockedBadge] = useState<{ name: string; description: string } | null>(null);
  const [achievementsMap, setAchievementsMap] = useState<Map<string, { name: string; description: string }>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const dash = await api.patientDashboard();
        if (cancelled) return;
        const m = new Map<string, { name: string; description: string }>();
        for (const a of dash.achievements) m.set(a.id, { name: a.name, description: a.description });
        setAchievementsMap(m);
      } catch {
        // best-effort — confetti will still fire with the badge code as the name
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await api.getExercise(params.id);
        if (!cancelled) {
          setEx(d);
          setStage(d.type === "perception" ? "perception" : "production");
          if (d.type === "production") setPerceptionUnlocked(true);
        }
      } catch (e) {
        toast({ title: "Failed to load exercise", description: String(e), variant: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id, toast]);

  if (!ex) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size={28} />
      </div>
    );
  }

  function speak(word: string) {
    if (typeof window === "undefined") return;
    const u = new SpeechSynthesisUtterance(word);
    u.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  function answerPerception(picked: "target" | "alt") {
    if (picked === "target") setPerceptionRight((n) => n + 1);
    const next = perceptionIdx + 1;
    if (!ex) return;
    if (next >= ex.items.length) {
      const accuracy = ((perceptionRight + (picked === "target" ? 1 : 0)) / ex.items.length) * 100;
      if (accuracy >= 80) {
        setPerceptionUnlocked(true);
        toast({
          title: `${Math.round(accuracy)}% — production unlocked`,
          variant: "success",
        });
        if (ex.type === "perception") {
          setStage("summary");
        } else {
          setStage("production");
        }
      } else {
        toast({
          title: `${Math.round(accuracy)}% — try again to unlock production`,
          variant: "info",
        });
        setPerceptionIdx(0);
        setPerceptionRight(0);
      }
    } else {
      setPerceptionIdx(next);
    }
  }

  async function handleScored(result: { score: number; mfccMean: number[]; blob: Blob }) {
    if (!ex) return;
    setSubmitting(true);
    try {
      const r = await api.submitScore({
        exerciseId: ex.id,
        score: result.score,
        selfRating,
        mfccVector: result.mfccMean.length > 0 ? result.mfccMean : undefined,
      });
      setLastResult({ score: result.score, selfRating });
      setScoresSubmitted((n) => n + 1);
      setTotalXp(r.totalXp);
      patchPatient({
        xp: r.totalXp,
        coins: r.totalCoins,
        streakDays: r.streakDays,
      });
      toast({
        title: `+${r.xpGained} XP, +${r.coinsGained} coins`,
        description:
          r.newlyUnlockedBadges.length > 0
            ? `Unlocked: ${r.newlyUnlockedBadges.join(", ")}`
            : "Nice attempt!",
        variant: "success",
      });
      // Audio celebration: applause for any decent score, chime + bigger applause on badge unlock
      if (result.score >= 80) playApplause("loud");
      else if (result.score >= 60) playApplause("soft");
      if (r.newlyUnlockedBadges.length > 0) {
        const code = r.newlyUnlockedBadges[0]!;
        const meta = achievementsMap.get(code) ?? { name: code, description: "Badge unlocked" };
        setUnlockedBadge(meta);
        playChime();
        setTimeout(() => playApplause("loud"), 200);
      }
      setSelfRating(null);
    } catch (e) {
      toast({ title: "Failed to submit score", description: String(e), variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  function nextProduction() {
    if (!ex) return;
    const next = productionIdx + 1;
    if (next >= ex.items.length) {
      setStage("summary");
    } else {
      setProductionIdx(next);
      setLastResult(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <BadgeUnlockBurst badge={unlockedBadge} onClose={() => setUnlockedBadge(null)} />
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="self-start">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      <div>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h1 className="font-display text-3xl text-ink-900">{ex.title}</h1>
          <DifficultyBadge level={ex.difficulty} />
          <Badge variant="primary">{ex.type}</Badge>
        </div>
        <p className="text-sm text-ink-600">{ex.description}</p>
        {ex.targetPhonemes.length > 0 && (
          <p className="text-xs text-ink-500 mt-1 font-mono">
            target phonemes: {ex.targetPhonemes.join(" · ")}
          </p>
        )}
      </div>

      {/* Stage indicator */}
      <div className="flex items-center gap-2">
        {ex.type !== "production" && (
          <Stage label="Perception" active={stage === "perception"} done={stage !== "perception" && perceptionUnlocked} />
        )}
        {ex.type !== "perception" && (
          <Stage
            label="Production"
            active={stage === "production"}
            done={stage === "summary"}
            locked={!perceptionUnlocked && ex.type !== "production"}
          />
        )}
        <Stage label="Summary" active={stage === "summary"} done={false} />
      </div>

      <AnimatePresence mode="wait">
        {stage === "perception" && (
          <motion.div
            key="perception"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader
                title={`Perception — ${perceptionIdx + 1} of ${ex.items.length}`}
                subtitle={ex.items[perceptionIdx]?.prompt}
              />
              <div className="grid grid-cols-2 gap-3">
                {(["target", "alt"] as const).map((side) => {
                  const word = side === "target" ? ex.items[perceptionIdx]?.targetWord : ex.items[perceptionIdx]?.altWord;
                  if (!word) return null;
                  return (
                    <button
                      key={side}
                      onClick={() => {
                        speak(word);
                        setTimeout(() => answerPerception(side), 600);
                      }}
                      className="rounded-2xl bg-white border-2 border-ink-200 hover:border-brand-400 hover:bg-brand-50 p-6 text-center transition group shadow-soft hover:shadow-lift"
                    >
                      <Volume2 className="w-5 h-5 mx-auto mb-2 text-brand-500 group-hover:text-brand-700" />
                      <p className="font-display text-2xl text-ink-900">{word}</p>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-ink-500 mt-4 text-center">
                Tap the word that matches the prompt. {perceptionRight} correct so far.
              </p>
            </Card>
          </motion.div>
        )}

        {stage === "production" && (
          <motion.div
            key="production"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader
                title={`Production — ${productionIdx + 1} of ${ex.items.length}`}
                subtitle="Record yourself saying the word."
              />
              <div className="flex justify-center mb-6">
                <SpeakingCharacter
                  word={ex.items[productionIdx]?.targetWord ?? ""}
                  autoPlay
                  label="Listen, then say it"
                />
              </div>

              <div className="mb-4">
                <p className="text-xs uppercase tracking-wider text-ink-500 mb-2 font-semibold">
                  How well do you think you said it?
                </p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setSelfRating(n)}
                      className={cn(
                        "h-10 w-10 rounded-lg border-2 transition",
                        selfRating !== null && n <= selfRating
                          ? "bg-gold-400/20 border-gold-400 text-gold-600"
                          : "bg-white border-ink-200 text-ink-300 hover:border-gold-300"
                      )}
                    >
                      <Star className="w-4 h-4 mx-auto" fill={selfRating !== null && n <= selfRating ? "currentColor" : "none"} />
                    </button>
                  ))}
                </div>
              </div>

              <AudioRecorder onScored={handleScored} maxDurationMs={4000} />

              {submitting && (
                <p className="text-xs text-ink-500 mt-3 text-center">Submitting…</p>
              )}

              {lastResult && !submitting && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 rounded-xl bg-brand-50 border-2 border-brand-200 p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs uppercase tracking-wider text-ink-500 font-semibold">
                      Pronunciation score
                    </p>
                    <p className="font-display text-4xl text-brand-700">{lastResult.score}</p>
                  </div>
                  <Button onClick={nextProduction}>
                    Next <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              )}
            </Card>
          </motion.div>
        )}

        {stage === "summary" && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="text-center py-10">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-brand-500" />
              <h2 className="font-display text-3xl mb-2 text-ink-900">Session complete</h2>
              <p className="text-sm text-ink-600 mb-6">
                {scoresSubmitted > 0
                  ? `${scoresSubmitted} attempt${scoresSubmitted === 1 ? "" : "s"} submitted. Total XP now: ${totalXp}.`
                  : "Nice work."}
              </p>
              <div className="flex items-center justify-center gap-2">
                <Link href="/app">
                  <Button variant="glass">Back to dashboard</Button>
                </Link>
                <Link href="/app/exercise/free">
                  <Button>Practice another</Button>
                </Link>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stage({
  label,
  active,
  done,
  locked,
}: {
  label: string;
  active: boolean;
  done: boolean;
  locked?: boolean;
}) {
  return (
    <div
      className={cn(
        "px-3 py-1 rounded-full text-xs border font-medium",
        active
          ? "bg-brand-100 border-brand-300 text-brand-800"
          : done
          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
          : locked
          ? "bg-ink-100 border-ink-200 text-ink-400"
          : "bg-white border-ink-200 text-ink-500"
      )}
    >
      {label}
      {locked && " 🔒"}
      {done && " ✓"}
    </div>
  );
}
