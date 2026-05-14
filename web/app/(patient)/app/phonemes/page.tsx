"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, CheckCircle2, Sparkles, ArrowRight, Volume2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api-client";
import type { PhonemeWordDTO } from "shared";
import { cn } from "@/lib/utils";
import { getPhonemeMeta, TIER_INFO, type PhonemeTier } from "@/lib/phoneme-importance";

const TIER_ORDER: PhonemeTier[] = ["beginner", "intermediate", "advanced"];

export default function PhonemeRoadmapPage() {
  const [list, setList] = useState<PhonemeWordDTO[] | null>(null);
  const [language, setLanguage] = useState<"all" | "en" | "hi">("en");
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [phonemes, scores] = await Promise.all([api.listPhonemes(), api.patientScores()]);
        if (cancelled) return;
        setList(phonemes);
        // Mark a phoneme as "practiced" if any score exists for an exercise targeting that phoneme.
        // We only have scores keyed to exerciseIds, not phonemes, so we use exercise list to map.
        try {
          const exercises = await api.listExercises();
          const completedExerciseIds = new Set(scores.map((s) => s.exerciseId));
          const practicedPhonemes = new Set<string>();
          for (const ex of exercises) {
            if (completedExerciseIds.has(ex.id)) {
              for (const p of ex.targetPhonemes) practicedPhonemes.add(p);
            }
          }
          setCompleted(practicedPhonemes);
        } catch {
          // best-effort
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => (list ?? []).filter((p) => language === "all" || p.language === language),
    [list, language]
  );

  // Group by tier (using getPhonemeMeta), then within tier by category for stable ordering.
  const grouped = useMemo(() => {
    const buckets: Record<PhonemeTier, PhonemeWordDTO[]> = {
      beginner: [],
      intermediate: [],
      advanced: [],
    };
    for (const p of filtered) {
      const tier = getPhonemeMeta(p.ipa, p.category).tier;
      buckets[tier].push(p);
    }
    for (const t of TIER_ORDER) {
      buckets[t].sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.ipa.localeCompare(b.ipa);
      });
    }
    return buckets;
  }, [filtered]);

  // Unlock logic: a tier unlocks when ≥60% of the previous tier's phonemes are practiced.
  const tierUnlocked: Record<PhonemeTier, boolean> = useMemo(() => {
    const out: Record<PhonemeTier, boolean> = { beginner: true, intermediate: false, advanced: false };
    if (grouped.beginner.length === 0) {
      out.intermediate = true;
    } else {
      const begDone = grouped.beginner.filter((p) => completed.has(p.ipa)).length;
      out.intermediate = begDone / grouped.beginner.length >= 0.6;
    }
    if (out.intermediate) {
      if (grouped.intermediate.length === 0) {
        out.advanced = true;
      } else {
        const intDone = grouped.intermediate.filter((p) => completed.has(p.ipa)).length;
        out.advanced = intDone / grouped.intermediate.length >= 0.6;
      }
    }
    return out;
  }, [grouped, completed]);

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

  const overallProgress = filtered.length > 0
    ? Math.round((filtered.filter((p) => completed.has(p.ipa)).length / filtered.length) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-brand-700 dark:text-brand-300 font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Phoneme journey
        </div>
        <h1 className="font-display text-4xl mb-2 text-ink-900 dark:text-ink-100">
          Master English sounds, one tier at a time
        </h1>
        <p className="text-base text-ink-700 dark:text-ink-300 max-w-2xl">
          Phonemes are the smallest building blocks of speech — about 44 in English. Start with the
          easiest, build confidence, then tackle the trickier sounds. Each tier unlocks once you&apos;ve
          practiced ~60% of the previous one.
        </p>
        <div className="flex items-center gap-3 mt-5">
          <div className="flex-1 max-w-md">
            <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
              <span>Overall progress</span>
              <span>{overallProgress}%</span>
            </div>
            <div className="h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            {(["en", "hi", "all"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setLanguage(opt)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] uppercase tracking-wider font-semibold transition border",
                  language === opt
                    ? "bg-brand-100 dark:bg-brand-900 border-brand-300 dark:border-brand-700 text-brand-800 dark:text-brand-200"
                    : "bg-white dark:bg-ink-900 border-ink-200 dark:border-ink-700 text-ink-500"
                )}
              >
                {opt === "all" ? "All" : opt === "en" ? "English" : "हिन्दी"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {TIER_ORDER.map((tier, tierIdx) => {
        const phonemes = grouped[tier];
        if (phonemes.length === 0) return null;
        const info = TIER_INFO[tier];
        const unlocked = tierUnlocked[tier];
        const tierDone = phonemes.filter((p) => completed.has(p.ipa)).length;
        const tierPct = Math.round((tierDone / phonemes.length) * 100);

        return (
          <motion.section
            key={tier}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: tierIdx * 0.1 }}
          >
            <div className="flex items-end justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <TierMedal tier={tier} unlocked={unlocked} />
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
                  <p className="text-sm text-ink-600 dark:text-ink-400">{info.tagline}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-ink-500">{tierDone} of {phonemes.length}</p>
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
                  Practice ~60% of the previous tier to unlock these sounds.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {phonemes.map((p, i) => {
                  const meta = getPhonemeMeta(p.ipa, p.category);
                  const done = completed.has(p.ipa);
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: tierIdx * 0.05 + i * 0.02 }}
                    >
                      <Link
                        href={`/app/phonemes/${p.id}`}
                        className={cn(
                          "group relative flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 p-4 transition aspect-square",
                          done
                            ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700"
                            : "bg-white dark:bg-ink-900 border-ink-200 dark:border-ink-700 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-ink-800"
                        )}
                        title={meta.importance}
                      >
                        {done && (
                          <CheckCircle2 className="absolute top-1.5 right-1.5 w-4 h-4 text-emerald-500" />
                        )}
                        <span className="font-mono text-xl text-ink-900 dark:text-ink-100">{p.ipa}</span>
                        <span className="text-xs text-ink-600 dark:text-ink-400 font-medium">{p.label}</span>
                        {p.voicing && (
                          <Badge variant="info" className="text-[9px] px-1.5 py-0">
                            voiced
                          </Badge>
                        )}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.section>
        );
      })}

      <Card className="bg-brand-50 dark:bg-brand-950 border-brand-200 dark:border-brand-800">
        <CardHeader
          title="What's next?"
          subtitle="Once you're comfortable with individual phonemes, jump into structured exercises."
        />
        <Link
          href="/app/exercise/free"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 dark:text-brand-300 hover:underline"
        >
          <Volume2 className="w-4 h-4" />
          Open the free practice library
          <ArrowRight className="w-4 h-4" />
        </Link>
      </Card>
    </div>
  );
}

function TierMedal({ tier, unlocked }: { tier: PhonemeTier; unlocked: boolean }) {
  const idx = TIER_ORDER.indexOf(tier) + 1;
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
