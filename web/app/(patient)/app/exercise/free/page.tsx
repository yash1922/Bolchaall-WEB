"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Lock, Sparkles, Trophy, Mic, Headphones } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge, DifficultyBadge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api-client";
import type { ExerciseDTO, ExerciseTier, ScoreDTO } from "shared";
import { cn } from "@/lib/utils";

interface SetGroup {
  name: string;
  tier: ExerciseTier;
  exercises: ExerciseDTO[];
}

const TIER_ORDER: ExerciseTier[] = ["beginner", "intermediate", "advanced"];

const TIER_INFO: Record<ExerciseTier, { label: string; tagline: string; color: "emerald" | "brand" | "coral" }> = {
  beginner: {
    label: "Beginner",
    tagline: "High-frequency sounds and easy contrasts. Build your daily streak here.",
    color: "emerald",
  },
  intermediate: {
    label: "Intermediate",
    tagline: "Tongue placement, voicing pairs, and vowel length. Where most learners spend the most time.",
    color: "brand",
  },
  advanced: {
    label: "Advanced",
    tagline: "Tricky placements, diphthongs, consonant clusters. Polish your speech here.",
    color: "coral",
  },
};

export default function FreePracticeRoadmapPage() {
  const [list, setList] = useState<ExerciseDTO[] | null>(null);
  const [scores, setScores] = useState<ScoreDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [exs, sc] = await Promise.all([api.listExercises(), api.patientScores()]);
        if (!cancelled) {
          setList(exs);
          setScores(sc);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const completedExerciseIds = useMemo(() => new Set(scores.map((s) => s.exerciseId)), [scores]);

  // Group exercises by tier, then by setName
  const tierGroups: Record<ExerciseTier, SetGroup[]> = useMemo(() => {
    const result: Record<ExerciseTier, SetGroup[]> = {
      beginner: [],
      intermediate: [],
      advanced: [],
    };
    if (!list) return result;
    const byTier: Record<ExerciseTier, ExerciseDTO[]> = {
      beginner: [],
      intermediate: [],
      advanced: [],
    };
    for (const e of list) byTier[e.tier].push(e);

    for (const tier of TIER_ORDER) {
      const sets = new Map<string, ExerciseDTO[]>();
      for (const e of byTier[tier]) {
        const arr = sets.get(e.setName) ?? [];
        arr.push(e);
        sets.set(e.setName, arr);
      }
      const groups: SetGroup[] = Array.from(sets.entries()).map(([name, exs]) => ({
        name,
        tier,
        exercises: exs.sort((a, b) => a.setOrder - b.setOrder),
      }));
      groups.sort((a, b) => a.name.localeCompare(b.name));
      result[tier] = groups;
    }
    return result;
  }, [list]);

  // Unlock progression: a tier opens once 60% of exercises in the previous tier are completed.
  const tierUnlocked: Record<ExerciseTier, boolean> = useMemo(() => {
    const out: Record<ExerciseTier, boolean> = {
      beginner: true,
      intermediate: false,
      advanced: false,
    };
    const begAll = tierGroups.beginner.flatMap((g) => g.exercises);
    const intAll = tierGroups.intermediate.flatMap((g) => g.exercises);
    if (begAll.length === 0 || begAll.filter((e) => completedExerciseIds.has(e.id)).length / begAll.length >= 0.6) {
      out.intermediate = true;
    }
    if (out.intermediate && (intAll.length === 0 || intAll.filter((e) => completedExerciseIds.has(e.id)).length / intAll.length >= 0.6)) {
      out.advanced = true;
    }
    return out;
  }, [tierGroups, completedExerciseIds]);

  if (error)
    return (
      <Card>
        <p className="text-rose-600">{error}</p>
      </Card>
    );
  if (!list)
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size={28} />
      </div>
    );

  const totalDone = list.filter((e) => completedExerciseIds.has(e.id)).length;
  const totalPct = list.length > 0 ? Math.round((totalDone / list.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-brand-700 dark:text-brand-300 font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Practice roadmap
        </div>
        <h1 className="font-display text-4xl mb-2 text-ink-900 dark:text-ink-100">
          Your guided practice journey
        </h1>
        <p className="text-base text-ink-700 dark:text-ink-300 max-w-2xl">
          Each tier is a stack of bite-sized exercises. Finish ~60% of a tier to unlock the next.
          Mix <em>perception</em> drills (listen + pick) and <em>production</em> drills (record + score) for the best results.
        </p>
        <div className="mt-5 max-w-md">
          <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
            <span>Overall progress</span>
            <span>{totalDone} of {list.length} ({totalPct}%)</span>
          </div>
          <div className="h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all"
              style={{ width: `${totalPct}%` }}
            />
          </div>
        </div>
      </div>

      {TIER_ORDER.map((tier, tierIdx) => {
        const groups = tierGroups[tier];
        if (groups.length === 0) return null;
        const info = TIER_INFO[tier];
        const unlocked = tierUnlocked[tier];
        const tierExs = groups.flatMap((g) => g.exercises);
        const tierDone = tierExs.filter((e) => completedExerciseIds.has(e.id)).length;
        const tierPct = tierExs.length > 0 ? Math.round((tierDone / tierExs.length) * 100) : 0;

        return (
          <motion.section
            key={tier}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: tierIdx * 0.1 }}
          >
            <div className="flex items-end justify-between gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-3">
                <TierMedal tier={tier} unlocked={unlocked} idx={tierIdx + 1} />
                <div>
                  <h2 className="font-display text-2xl text-ink-900 dark:text-ink-100 flex items-center gap-2">
                    Tier {tierIdx + 1} · {info.label}
                    {!unlocked && (
                      <span className="inline-flex items-center gap-1 text-xs text-ink-500 font-sans font-normal">
                        <Lock className="w-3.5 h-3.5" />
                        locked
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-ink-600 dark:text-ink-400 max-w-xl">{info.tagline}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-ink-500">{tierDone} of {tierExs.length}</p>
                <div className="w-32 h-1.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden mt-1">
                  <div
                    className={cn(
                      "h-full transition-all",
                      info.color === "emerald" && "bg-emerald-500",
                      info.color === "brand" && "bg-brand-500",
                      info.color === "coral" && "bg-coral-500"
                    )}
                    style={{ width: `${tierPct}%` }}
                  />
                </div>
              </div>
            </div>

            {!unlocked ? (
              <Card className="text-center py-8">
                <Lock className="w-8 h-8 mx-auto mb-2 text-ink-400" />
                <p className="text-sm text-ink-600 dark:text-ink-400">
                  Complete ~60% of the previous tier to unlock these exercises.
                </p>
              </Card>
            ) : (
              <div className="flex flex-col gap-4">
                {groups.map((group, gIdx) => {
                  const setDone = group.exercises.filter((e) => completedExerciseIds.has(e.id)).length;
                  const setPct = Math.round((setDone / group.exercises.length) * 100);
                  return (
                    <div key={group.name}>
                      <div className="flex items-end justify-between gap-2 mb-2">
                        <h3 className="font-display text-lg text-ink-900 dark:text-ink-100">
                          {group.name}
                        </h3>
                        <span className="text-xs text-ink-500">
                          {setDone} of {group.exercises.length} done · {setPct}%
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {group.exercises.map((ex, i) => {
                          const done = completedExerciseIds.has(ex.id);
                          const Icon = ex.type === "perception" ? Headphones : Mic;
                          return (
                            <motion.div
                              key={ex.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                duration: 0.25,
                                delay: tierIdx * 0.05 + gIdx * 0.04 + i * 0.02,
                              }}
                            >
                              <Link href={`/app/exercise/${ex.id}`}>
                                <Card
                                  className={cn(
                                    "hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-lift transition cursor-pointer h-full group",
                                    done &&
                                      "bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700"
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-start gap-2 flex-1 min-w-0">
                                      <div
                                        className={cn(
                                          "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                                          ex.type === "perception"
                                            ? "bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300"
                                            : "bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300"
                                        )}
                                      >
                                        <Icon className="w-4 h-4" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-display text-base text-ink-900 dark:text-ink-100">
                                          {ex.title}
                                        </p>
                                        <p className="text-sm text-ink-600 dark:text-ink-400 mt-0.5">
                                          {ex.description}
                                        </p>
                                      </div>
                                    </div>
                                    {done && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <DifficultyBadge level={ex.difficulty} />
                                    <Badge variant="primary">{ex.type}</Badge>
                                    <span className="text-xs text-ink-500">{ex.items.length} items</span>
                                    {ex.targetPhonemes.length > 0 && (
                                      <span className="text-xs text-ink-500 font-mono">
                                        {ex.targetPhonemes.join(" · ")}
                                      </span>
                                    )}
                                    <ArrowRight className="w-4 h-4 ml-auto text-ink-400 group-hover:text-brand-600 group-hover:translate-x-1 transition" />
                                  </div>
                                </Card>
                              </Link>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.section>
        );
      })}

      <Card className="bg-gradient-to-br from-brand-50 to-coral-50 dark:from-brand-950 dark:to-coral-950 border-brand-200 dark:border-brand-800 text-center py-8">
        <Trophy className="w-10 h-10 text-gold-500 mx-auto mb-3" />
        <h3 className="font-display text-2xl text-ink-900 dark:text-ink-100 mb-2">
          Why does this order matter?
        </h3>
        <p className="text-sm text-ink-700 dark:text-ink-300 max-w-2xl mx-auto">
          Speech-language pathologists teach in a deliberate sequence: voicing first, then place of
          articulation, then complex blends. Following the roadmap builds your articulation muscle memory
          in the right order — leading to faster, lasting improvement.
        </p>
      </Card>
    </div>
  );
}

function TierMedal({ tier, unlocked, idx }: { tier: ExerciseTier; unlocked: boolean; idx: number }) {
  const colorClass =
    tier === "beginner"
      ? "from-emerald-400 to-emerald-600"
      : tier === "intermediate"
      ? "from-brand-400 to-brand-600"
      : "from-coral-400 to-coral-600";
  return (
    <div
      className={cn(
        "h-14 w-14 rounded-2xl flex items-center justify-center text-white font-display text-2xl shadow-soft",
        unlocked ? `bg-gradient-to-br ${colorClass}` : "bg-ink-200 dark:bg-ink-800 text-ink-400"
      )}
    >
      {unlocked ? idx : <Lock className="w-5 h-5" />}
    </div>
  );
}
