"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ClipboardList,
  CheckCircle2,
  PlayCircle,
  MessageSquareText,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge, DifficultyBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api-client";
import type { AssignmentDTO } from "shared";
import { formatRelative, cn } from "@/lib/utils";

export default function PatientAssignmentsPage() {
  const [list, setList] = useState<AssignmentDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await api.patientAssignments();
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

  const open = list.filter((a) => !a.completedAt);
  const awaiting = list.filter((a) => a.completedAt && !a.reviewedAt);
  const reviewed = list.filter((a) => !!a.reviewedAt);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl mb-1 text-ink-900 dark:text-ink-100">
          Your assignments
        </h1>
        <p className="text-sm text-ink-600 dark:text-ink-400">
          Exercises sent by your therapist. Complete them to get a personalized score and written feedback.
        </p>
      </div>

      <Section
        title="To do"
        emptyText="No open assignments — your therapist hasn't sent anything new."
        items={open}
        renderRight={(a) => (
          <Link href={`/app/exercise/${a.exerciseId}?assignmentId=${a.id}`}>
            <Button size="sm">
              <PlayCircle className="w-4 h-4" />
              Start
            </Button>
          </Link>
        )}
      />

      <Section
        title="Awaiting therapist review"
        emptyText="Nothing waiting. Once you finish an assignment, it lands here until your therapist reviews it."
        items={awaiting}
        statusBadge="warning"
        statusLabel="awaiting review"
      />

      <Section
        title="Reviewed by your therapist"
        emptyText="No reviewed assignments yet."
        items={reviewed}
        statusBadge="success"
        statusLabel="reviewed"
        renderBody={(a) => (
          <div className="mt-3 pt-3 border-t border-ink-200 dark:border-ink-700">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquareText className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <p className="text-xs uppercase tracking-wider text-ink-600 dark:text-ink-400 font-semibold">
                {a.doctorName ?? "Your therapist"}&apos;s feedback
              </p>
              {a.therapistManualScore !== null && a.therapistManualScore !== undefined && (
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-brand-100 dark:bg-brand-900 px-2.5 py-0.5 text-xs font-semibold text-brand-800 dark:text-brand-200">
                  <Sparkles className="w-3 h-3" />
                  Therapist score: {a.therapistManualScore}
                </span>
              )}
            </div>
            {a.therapistFeedback ? (
              <p className="text-sm text-ink-800 dark:text-ink-200 whitespace-pre-wrap">
                {a.therapistFeedback}
              </p>
            ) : (
              <p className="text-sm text-ink-500 italic">
                Reviewed without a written note.
              </p>
            )}
            <p className="text-xs text-ink-500 mt-2">
              Reviewed {a.reviewedAt ? formatRelative(a.reviewedAt) : "recently"}
            </p>
          </div>
        )}
      />
    </div>
  );
}

function Section({
  title,
  emptyText,
  items,
  statusBadge,
  statusLabel,
  renderRight,
  renderBody,
}: {
  title: string;
  emptyText: string;
  items: AssignmentDTO[];
  statusBadge?: "warning" | "success" | "muted";
  statusLabel?: string;
  renderRight?: (a: AssignmentDTO) => React.ReactNode;
  renderBody?: (a: AssignmentDTO) => React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-display text-xl text-ink-900 dark:text-ink-100">{title}</h2>
        <span className="text-xs text-ink-500">({items.length})</span>
      </div>
      {items.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-500 py-6 text-center">{emptyText}</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
            >
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                        a.reviewedAt
                          ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300"
                          : "bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300"
                      )}
                    >
                      {a.reviewedAt ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <ClipboardList className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-base text-ink-900 dark:text-ink-100">
                        {a.exerciseTitle}
                      </p>
                      <p className="text-xs text-ink-500 mt-0.5">
                        from {a.doctorName ?? "your therapist"} ·{" "}
                        {formatRelative(a.createdAt)}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        {a.exerciseDifficulty && (
                          <DifficultyBadge
                            level={a.exerciseDifficulty as "easy" | "medium" | "hard"}
                          />
                        )}
                        {a.exerciseType && <Badge variant="primary">{a.exerciseType}</Badge>}
                        {statusBadge && (
                          <Badge variant={statusBadge}>{statusLabel}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {renderRight?.(a)}
                </div>
                {renderBody?.(a)}
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
