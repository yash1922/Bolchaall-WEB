"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Flame, BookOpen, Mic, Trophy, ListTodo, RefreshCw } from "lucide-react";
import { Card, CardHeader, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CardSkeleton, StatCardSkeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { XPBar } from "@/components/patient/XPBar";
import { AchievementBadge } from "@/components/patient/AchievementBadge";
import { ProgressChart } from "@/components/patient/ProgressChart";
import { api } from "@/lib/api-client";
import { trialDaysLeft, isTrialExpired } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";

type Dashboard = Awaited<ReturnType<typeof api.patientDashboard>>;

export default function PatientDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);

  const fetchDashboard = useCallback(
    async (silent: boolean) => {
      if (!silent) setRefreshing(true);
      try {
        const d = await api.patientDashboard();
        setData(d);
        try {
          const me = await api.me();
          setSession(me);
        } catch {
          /* best-effort */
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        if (!silent) setRefreshing(false);
      }
    },
    [setSession]
  );

  // Initial load
  useEffect(() => {
    fetchDashboard(true);
  }, [fetchDashboard]);

  // Refetch whenever the tab becomes visible again (user navigated back from a recording).
  // Without this, scores recorded on /app/phonemes/[id] don't appear here until a hard reload.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        fetchDashboard(true);
      }
    };
    const onFocus = () => fetchDashboard(true);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchDashboard]);

  if (error) {
    return (
      <Card>
        <p className="text-rose-600">Failed to load dashboard: {error}</p>
      </Card>
    );
  }
  if (!data) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <div className="h-8 w-64 rounded-lg bg-ink-100 dark:bg-ink-800 animate-pulse mb-2" />
          <div className="h-4 w-40 rounded bg-ink-100 dark:bg-ink-800 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <CardSkeleton rows={2} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CardSkeleton rows={4} />
          <CardSkeleton rows={3} />
        </div>
      </div>
    );
  }

  const { patient, recentScores, openAssignmentsCount, assignedDoctor, achievements } = data;
  const trialDays = trialDaysLeft(patient.trialEndsAt);
  const expired = isTrialExpired(patient.trialEndsAt) && patient.subscriptionStatus === "trial";
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  // First-time user: nothing recorded yet. Render a giant CTA so they can't miss the entry point.
  const isFirstTime = patient.xp === 0 && recentScores.length === 0 && !patient.lastPracticedAt;

  return (
    <div className="flex flex-col gap-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start justify-between gap-3"
      >
        <div>
          <h1 className="font-display text-3xl mb-1 text-ink-900 dark:text-ink-100">
            Welcome back{patient.conditions.length > 0 ? "" : "!"}
          </h1>
          <p className="text-sm text-ink-600 dark:text-ink-400">
            {patient.subscriptionStatus === "trial" && !expired && `Trial — ${trialDays} day${trialDays === 1 ? "" : "s"} left.`}
            {expired && (
              <span className="text-coral-700">
                Your trial has ended.{" "}
                <Link href="/app/billing/success" className="underline">
                  Upgrade to keep practicing.
                </Link>
              </span>
            )}
            {patient.subscriptionStatus === "active" && "Premium — practice as much as you want."}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchDashboard(false)}
          disabled={refreshing}
          aria-label="Refresh dashboard"
          title="Refresh — click after recording if your scores don't appear"
        >
          <RefreshCw className={refreshing ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </motion.div>

      {isFirstTime && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
        >
          <Card className="bg-gradient-to-br from-brand-100 via-brand-50 to-coral-50 dark:from-brand-900 dark:via-brand-950 dark:to-coral-950 border-brand-300 dark:border-brand-700">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center shadow-soft shrink-0">
                <Mic className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-[260px]">
                <h2 className="font-display text-2xl text-ink-900 dark:text-ink-100 mb-1">
                  Ready for your first recording?
                </h2>
                <p className="text-sm text-ink-700 dark:text-ink-300 mb-4">
                  You haven&apos;t practised yet — your dashboard is empty until you record one
                  attempt. Pick a phoneme, hit <strong>Start recording</strong>, say the sample
                  word, then <strong>Stop</strong>. You&apos;ll earn XP, coins, and your first
                  badge instantly.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href="/app/phonemes">
                    <Button variant="primary">
                      <BookOpen className="w-4 h-4" />
                      Pick a phoneme
                    </Button>
                  </Link>
                  <Link href="/app/exercise/free">
                    <Button variant="ghost">
                      <Mic className="w-4 h-4" />
                      Or browse exercises
                    </Button>
                  </Link>
                </div>
                <p className="text-xs text-ink-500 dark:text-ink-400 mt-3">
                  Tip: allow microphone access when your browser asks. If nothing happens after
                  recording, open DevTools (F12) → Console and screenshot any red errors.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Streak"
          value={`${patient.streakDays}d`}
          hint="Keep it going daily"
          icon={<Flame className="w-5 h-5" />}
          trend="up"
        />
        <StatCard
          label="Coins"
          value={patient.coins.toLocaleString()}
          hint="Earn 10 per attempt"
          icon={<Trophy className="w-5 h-5 text-gold-400" />}
        />
        <StatCard
          label="Badges"
          value={`${unlockedCount}/${achievements.length}`}
          hint="Unlock more by practicing"
          icon={<Trophy className="w-5 h-5" />}
        />
        <StatCard
          label="Open assignments"
          value={openAssignmentsCount}
          hint={openAssignmentsCount > 0 ? "Tap to start" : "All caught up"}
          icon={<ListTodo className="w-5 h-5" />}
        />
      </div>

      <Card>
        <CardHeader title="Level progress" subtitle="Earn XP by completing exercises." />
        <XPBar xp={patient.xp} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Recent scores" subtitle="Last 10 attempts" />
          <ProgressChart data={recentScores} />
        </Card>

        <Card>
          <CardHeader
            title="Today's plan"
            subtitle={assignedDoctor ? `Assigned by ${assignedDoctor.name}` : "Self-guided practice"}
          />
          <div className="flex flex-col gap-3">
            <Link href="/app/exercise/free">
              <Button variant="glass" className="w-full justify-start gap-3">
                <Mic className="w-4 h-4" />
                Free practice — open library
              </Button>
            </Link>
            <Link href="/app/phonemes">
              <Button variant="glass" className="w-full justify-start gap-3">
                <BookOpen className="w-4 h-4" />
                Browse phoneme directory
              </Button>
            </Link>
            {assignedDoctor && (
              <Link href="/app/chat">
                <Button variant="glass" className="w-full justify-start gap-3">
                  <Trophy className="w-4 h-4" />
                  Message {assignedDoctor.name}
                </Button>
              </Link>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Achievements"
          subtitle={`${unlockedCount} unlocked of ${achievements.length}`}
          action={<Badge variant="primary">Gamified</Badge>}
        />
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-3">
          {achievements.map((a) => (
            <AchievementBadge
              key={a.id}
              name={a.name}
              description={a.description}
              icon={a.icon}
              unlocked={a.unlocked}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
