"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, CheckCircle2, Clock, AlertTriangle, Sparkles } from "lucide-react";
import { Card, CardHeader, StatCard } from "@/components/ui/Card";
import { Badge, DifficultyBadge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api-client";
import { formatRelative, cn } from "@/lib/utils";

type Homework = Awaited<ReturnType<typeof api.adminHomework>>[number];
type Filter = "all" | "pending" | "completed" | "reviewed" | "overdue";

/**
 * Homework assignments — exercises a therapist assigned to one of their patients.
 * NOT to be confused with the patient ↔ therapist pairings page at /admin/pairings.
 */
export default function AdminHomeworkPage() {
  const [list, setList] = useState<Homework[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    api.adminHomework()
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, []);

  const stats = useMemo(() => {
    const s = { total: 0, pending: 0, completed: 0, reviewed: 0, overdue: 0 };
    for (const a of list ?? []) {
      s.total += 1;
      s[a.status] += 1;
    }
    return s;
  }, [list]);

  const filtered = useMemo(() => {
    if (!list) return [];
    if (filter === "all") return list;
    return list.filter((a) => a.status === filter);
  }, [list, filter]);

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
        <h1 className="font-display text-3xl mb-1 text-ink-900 dark:text-ink-100">
          Homework assignments
        </h1>
        <p className="text-sm text-ink-600 dark:text-ink-400">
          Every exercise a therapist has assigned to a patient. To change which therapist a
          patient is paired with, go to{" "}
          <Link
            href="/admin/pairings"
            className="text-brand-700 dark:text-brand-300 underline"
          >
            Pairings
          </Link>
          .
        </p>
      </div>

      {/* Status stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Pending"
          value={stats.pending}
          hint="Not yet started"
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          hint="Awaiting review"
          icon={<ClipboardList className="w-5 h-5" />}
          trend="up"
        />
        <StatCard
          label="Reviewed"
          value={stats.reviewed}
          hint="Therapist gave feedback"
          icon={<CheckCircle2 className="w-5 h-5" />}
          trend="up"
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          hint="Past due, not done"
          icon={<AlertTriangle className="w-5 h-5" />}
          trend={stats.overdue > 0 ? "down" : "flat"}
        />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "completed", "reviewed", "overdue"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs uppercase tracking-wider font-semibold border transition",
              filter === f
                ? "bg-brand-100 dark:bg-brand-900 border-brand-300 dark:border-brand-700 text-brand-800 dark:text-brand-200"
                : "bg-white dark:bg-ink-900 border-ink-200 dark:border-ink-700 text-ink-600 dark:text-ink-400 hover:border-brand-300"
            )}
          >
            {f}
            <span className="text-[10px] font-mono opacity-70">
              {f === "all" ? stats.total : stats[f]}
            </span>
          </button>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-sm text-ink-500 dark:text-ink-400 py-12 text-center">
            <Sparkles className="w-5 h-5 mx-auto mb-2 text-ink-400" />
            No assignments {filter !== "all" && `in "${filter}"`} yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 dark:bg-ink-900/40">
                <tr>
                  <Th>Exercise</Th>
                  <Th>Patient</Th>
                  <Th>Therapist</Th>
                  <Th>Created</Th>
                  <Th>Due</Th>
                  <Th>Status</Th>
                  <Th>Score</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    className="border-t border-ink-200 dark:border-ink-700 hover:bg-brand-50/40 dark:hover:bg-ink-800/40 transition"
                  >
                    <td className="py-3 px-4">
                      <p className="font-medium text-ink-900 dark:text-ink-100">
                        {a.exerciseTitle}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {a.exerciseDifficulty && (
                          <DifficultyBadge
                            level={a.exerciseDifficulty as "easy" | "medium" | "hard"}
                          />
                        )}
                        {a.exerciseType && (
                          <Badge variant="muted">{a.exerciseType}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/users/${a.patientId}`}
                        className="text-ink-900 dark:text-ink-100 hover:text-brand-700 dark:hover:text-brand-300 hover:underline"
                      >
                        {a.patientName}
                      </Link>
                      <p className="text-[11px] text-ink-500 truncate max-w-[200px]">
                        {a.patientEmail}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/users/${a.doctorId}`}
                        className="text-ink-700 dark:text-ink-300 hover:text-brand-700 dark:hover:text-brand-300 hover:underline"
                      >
                        {a.doctorName}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-xs text-ink-500 dark:text-ink-400">
                      {formatRelative(a.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-xs text-ink-500 dark:text-ink-400">
                      {a.dueAt ? formatRelative(a.dueAt) : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="py-3 px-4 text-ink-700 dark:text-ink-300">
                      {a.therapistManualScore !== null ? (
                        <span className="inline-flex items-center gap-1 font-mono">
                          {a.therapistManualScore}/100
                        </span>
                      ) : (
                        <span className="text-ink-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-ink-600 dark:text-ink-400 font-semibold whitespace-nowrap">
      {children}
    </th>
  );
}

function StatusBadge({ status }: { status: Homework["status"] }) {
  const variant =
    status === "reviewed"
      ? "success"
      : status === "completed"
      ? "warning"
      : status === "overdue"
      ? "danger"
      : "muted";
  return <Badge variant={variant}>{status}</Badge>;
}
