"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge, DifficultyBadge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api-client";

export default function DoctorExercisesPage() {
  const [list, setList] = useState<Awaited<ReturnType<typeof api.doctorExercises>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await api.doctorExercises();
        if (!cancelled) setList(d);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl mb-1">Exercise library</h1>
        <p className="text-sm text-ink-600">
          {list.length} static exercises curated for the platform. Assign any of these to your patients from
          the patient detail page.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {list.map((ex) => (
          <Card key={ex.id}>
            <CardHeader title={ex.title} subtitle={ex.description} action={<DifficultyBadge level={ex.difficulty as "easy" | "medium" | "hard"} />} />
            <div className="flex flex-wrap gap-2 items-center">
              <Badge variant="primary">{ex.type}</Badge>
              {ex.targetPhonemes.length > 0 && (
                <span className="font-mono text-xs text-ink-500">
                  {ex.targetPhonemes.join(" · ")}
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
