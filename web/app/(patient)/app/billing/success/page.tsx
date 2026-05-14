"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Crown, CheckCircle2, Stethoscope, Mic, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store";

const PERKS: Array<{ icon: typeof Crown; title: string; body: string }> = [
  {
    icon: Stethoscope,
    title: "Dedicated therapist",
    body: "Your assigned therapist stays with you beyond the 3-day trial.",
  },
  {
    icon: Mic,
    title: "Full exercise library",
    body: "Unlock advanced production sets and unlimited daily practice.",
  },
  {
    icon: MessageCircle,
    title: "Priority chat",
    body: "Faster therapist response times and shared progress notes.",
  },
];

export default function BillingSuccess() {
  const { toast } = useToast();
  const patient = useAuthStore((s) => s.patient);
  const patchPatient = useAuthStore((s) => s.patchPatient);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(patient?.subscriptionStatus === "active");

  async function upgrade() {
    setLoading(true);
    try {
      const r = await api.upgradeDemo();
      patchPatient({
        subscriptionStatus: r.subscriptionStatus,
        trialEndsAt: r.trialEndsAt,
      });
      setDone(true);
      toast({
        title: "Premium unlocked",
        description: "Your subscription is active.",
        variant: "success",
      });
    } catch (e) {
      toast({
        title: "Upgrade failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto"
    >
      <Card className="text-center py-12">
        {done ? (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-500" />
            <h1 className="font-display text-3xl mb-2 text-ink-900 dark:text-ink-100">
              You&apos;re Premium
            </h1>
            <p className="text-sm text-ink-600 dark:text-ink-400 mb-6">
              Your subscription is active. Your therapist stays with you, and the full library is unlocked.
            </p>
            <Link href="/app">
              <Button>Back to dashboard</Button>
            </Link>
          </>
        ) : (
          <>
            <Crown className="w-12 h-12 mx-auto mb-4 text-gold-500" />
            <h1 className="font-display text-3xl mb-2 text-ink-900 dark:text-ink-100">
              Upgrade to Premium
            </h1>
            <p className="text-sm text-ink-600 dark:text-ink-400 mb-8 max-w-md mx-auto">
              Keep your therapist beyond the trial and unlock the full library.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 text-left">
              {PERKS.map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.title}
                    className="rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 p-4"
                  >
                    <Icon className="w-5 h-5 text-brand-600 dark:text-brand-400 mb-2" />
                    <p className="font-medium text-sm text-ink-900 dark:text-ink-100 mb-0.5">{p.title}</p>
                    <p className="text-xs text-ink-600 dark:text-ink-400">{p.body}</p>
                  </div>
                );
              })}
            </div>
            <Button size="lg" onClick={upgrade} loading={loading}>
              Upgrade — $29/mo
            </Button>
            <p className="text-xs text-ink-500 mt-3">
              Cancel anytime. 30-day money-back guarantee.
            </p>
          </>
        )}
      </Card>
    </motion.div>
  );
}
