"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, ClipboardList, Clock, Inbox } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge, DifficultyBadge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api-client";
import { formatRelative, cn } from "@/lib/utils";

type Item = Awaited<ReturnType<typeof api.doctorListAssignments>>[number];
type FilterKey = "pending_review" | "open" | "reviewed" | "all";

const TABS: Array<{ key: FilterKey; label: string; icon: typeof Inbox }> = [
  { key: "pending_review", label: "Awaiting your review", icon: Inbox },
  { key: "open", label: "Open (not yet started)", icon: Clock },
  { key: "reviewed", label: "Reviewed", icon: CheckCircle2 },
  { key: "all", label: "All", icon: ClipboardList },
];

export default function DoctorAssignmentsInboxPage() {
  const [tab, setTab] = useState<FilterKey>("pending_review");
  const [list, setList] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setList(null);
    (async () => {
      try {
        const d = await api.doctorListAssignments(tab);
        if (!cancelled) setList(d);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const counts = useMemo(() => {
    // Best-effort counts shown in tab labels (only the active tab is loaded — counts
    // would need a separate endpoint to populate other tabs; for now show the active count).
    return { active: list?.length ?? 0 };
  }, [list]);

  if (error)
    return (
      <Card>
        <p className="text-rose-600">{error}</p>
      </Card>
    );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl mb-1 text-ink-900 dark:text-ink-100">
          Submissions inbox
        </h1>
        <p className="text-sm text-ink-600 dark:text-ink-400">
          Patient submissions from exercises you assigned. Review the score, leave feedback, and give a manual mark.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition",
                active
                  ? "bg-brand-600 text-white border-brand-600 shadow-soft"
                  : "bg-white dark:bg-ink-900 text-ink-700 dark:text-ink-300 border-ink-200 dark:border-ink-700 hover:border-brand-300"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              {active && <span className="ml-1 text-xs opacity-90">({counts.active})</span>}
            </button>
          );
        })}
      </div>

      {!list ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size={28} />
        </div>
      ) : list.length === 0 ? (
        <Card className="text-center py-10">
          <Inbox className="w-10 h-10 mx-auto mb-2 text-ink-400" />
          <p className="text-sm text-ink-600 dark:text-ink-400">No assignments in this view.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((a, i) => {
            const status =
              a.reviewedAt
                ? "reviewed"
                : a.completedAt
                ? "pending_review"
                : "open";
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
              >
                <Link href={`/doctor/assignments/${a.id}`}>
                  <Card className="hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-lift transition cursor-pointer">
                    <CardHeader
                      title={a.exerciseTitle}
                      subtitle={`Assigned to ${a.patientName} · ${a.patientEmail}`}
                      action={
                        status === "reviewed" ? (
                          <Badge variant="success">reviewed</Badge>
                        ) : status === "pending_review" ? (
                          <Badge variant="warning">awaiting your review</Badge>
                        ) : (
                          <Badge variant="muted">not started</Badge>
                        )
                      }
                    />
                    <div className="flex items-center gap-2 flex-wrap text-xs text-ink-500">
                      <DifficultyBadge level={a.exerciseDifficulty as "easy" | "medium" | "hard"} />
                      <Badge variant="primary">{a.exerciseType}</Badge>
                      {a.exerciseTargetPhonemes.length > 0 && (
                        <span className="font-mono">
                          {a.exerciseTargetPhonemes.join(" · ")}
                        </span>
                      )}
                      <span>· assigned {formatRelative(a.createdAt)}</span>
                      {a.completedAt && (
                        <span>· completed {formatRelative(a.completedAt)}</span>
                      )}
                      {a.therapistManualScore !== null && (
                        <span className="ml-auto font-display text-base text-brand-700 dark:text-brand-300">
                          Your score: {a.therapistManualScore}
                        </span>
                      )}
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
