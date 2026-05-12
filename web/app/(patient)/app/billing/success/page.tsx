"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Crown, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store";

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
      toast({ title: "Premium unlocked", description: "30-day demo subscription active.", variant: "success" });
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
      className="max-w-xl mx-auto"
    >
      <Card className="text-center py-12">
        {done ? (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-400" />
            <h1 className="font-display text-3xl mb-2">You're Premium</h1>
            <p className="text-sm text-ink-600 mb-6">
              Demo mode — your subscription is active for 30 days. No real billing.
            </p>
            <Link href="/app">
              <Button>Back to dashboard</Button>
            </Link>
          </>
        ) : (
          <>
            <Crown className="w-12 h-12 mx-auto mb-4 text-gold-400" />
            <h1 className="font-display text-3xl mb-2">Upgrade to Premium</h1>
            <p className="text-sm text-ink-600 mb-6 max-w-md mx-auto">
              Unlimited daily practice, full phoneme directory, advanced therapist matching, and priority chat.
            </p>
            <p className="text-xs text-amber-300/80 mb-4">
              <strong>Demo mode:</strong> clicking upgrade flips your status without charging anything.
              Real Stripe is wired but disabled in this build.
            </p>
            <Button size="lg" onClick={upgrade} loading={loading}>
              Upgrade — $29/mo (demo)
            </Button>
          </>
        )}
      </Card>
    </motion.div>
  );
}
