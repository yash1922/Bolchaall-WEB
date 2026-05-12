"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge, DifficultyBadge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api-client";
import type { ExerciseDTO, ScoreDTO } from "shared";

interface SetGroup {
  name: string;
  exercises: ExerciseDTO[];
}

export default function FreePracticeLibrary() {
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

  const sets: SetGroup[] = useMemo(() => {
    if (!list) return [];
    const map = new Map<string, ExerciseDTO[]>();
    for (const e of list) {
      const key = e.setName ?? "Other";
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    const groups = Array.from(map.entries()).map(([name, exs]) => ({
      name,
      exercises: exs.sort((a, b) => a.setOrder - b.setOrder),
    }));
    groups.sort((a, b) => a.name.localeCompare(b.name));
    return groups;
  }, [list]);

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

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-4xl mb-1 text-ink-900">Practice library</h1>
        <p className="text-sm text-ink-600">
          {sets.length} sets · {list.length} exercises. Complete a set to unlock the next.
        </p>
      </div>

      {sets.map((group, groupIdx) => {
        const completedInSet = group.exercises.filter((e) => completedExerciseIds.has(e.id)).length;
        const total = group.exercises.length;
        const pct = total > 0 ? Math.round((completedInSet / total) * 100) : 0;

        return (
          <section key={group.name} className="flex flex-col gap-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl text-ink-900">{group.name}</h2>
                <p className="text-sm text-ink-600">
                  {completedInSet} of {total} done
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 rounded-full bg-ink-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-ink-600 w-9 text-right">{pct}%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {group.exercises.map((ex, i) => {
                const done = completedExerciseIds.has(ex.id);
                return (
                  <motion.div
                    key={ex.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: groupIdx * 0.05 + i * 0.04 }}
                  >
                    <Link href={`/app/exercise/${ex.id}`}>
                      <Card className="hover:border-brand-300 hover:shadow-lift transition cursor-pointer h-full group">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <p className="font-display text-lg text-ink-900 group-hover:text-brand-700 transition">
                              {ex.title}
                            </p>
                            <p className="text-sm text-ink-600 mt-0.5">{ex.description}</p>
                          </div>
                          {done && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-1" />
                          )}
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
          </section>
        );
      })}
    </div>
  );
}
