"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Stethoscope, MessageCircle, Sparkles, Crown } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { trialDaysLeft, isTrialExpired } from "@/lib/utils";
import { TherapistRatingCard } from "@/components/patient/TherapistRatingCard";

export default function TherapistPage() {
  const { toast } = useToast();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.patientDashboard>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);

  async function load() {
    try {
      const d = await api.patientDashboard();
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function autoMatch() {
    setMatching(true);
    try {
      const r = await api.patientAutoMatch();
      toast({
        title: r.doctor ? `Matched with ${r.doctor.name}` : "Matched with a therapist",
        variant: "success",
      });
      await load();
    } catch (e) {
      toast({
        title: "Could not match",
        description: e instanceof Error ? e.message : String(e),
        variant: "error",
      });
    } finally {
      setMatching(false);
    }
  }

  if (error)
    return (
      <Card>
        <p className="text-rose-600">{error}</p>
      </Card>
    );
  if (!data)
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size={28} />
      </div>
    );

  const { patient } = data;
  const doctor = data.assignedDoctor;
  const onTrial = patient.subscriptionStatus === "trial";
  const trialDays = trialDaysLeft(patient.trialEndsAt);
  const trialExpired = isTrialExpired(patient.trialEndsAt) && onTrial;
  const onPaid = patient.subscriptionStatus === "active";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl mb-1">Your therapist</h1>
        <p className="text-sm text-ink-600 dark:text-ink-400">
          {doctor
            ? onPaid
              ? "Your dedicated therapist."
              : `Trial therapist — ${trialDays} day${trialDays === 1 ? "" : "s"} of access remaining.`
            : trialExpired
            ? "Your trial has ended. Upgrade to keep a dedicated therapist."
            : "You haven't been matched with a therapist yet."}
        </p>
      </div>

      {doctor ? (
        <>
          <Card>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white shadow-soft">
                <Stethoscope className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h2 className="font-display text-2xl">{doctor.name}</h2>
                <p className="text-sm text-ink-600 dark:text-ink-400">{doctor.email}</p>
              </div>
              <Link href="/app/chat">
                <Button>
                  <MessageCircle className="w-4 h-4" />
                  Open chat
                </Button>
              </Link>
            </div>
          </Card>

          {onTrial && (
            <Card className="bg-coral-50 dark:bg-coral-950 border-coral-200 dark:border-coral-800">
              <CardHeader
                title="Keep your therapist after the trial"
                subtitle="Your assigned therapist is part of the free 3-day trial. Upgrade to keep dedicated therapist access (and unlock advanced exercises) when the trial ends."
              />
              <Link href="/app/billing/success">
                <Button variant="coral">
                  <Crown className="w-4 h-4" />
                  See subscription options
                </Button>
              </Link>
            </Card>
          )}

          <TherapistRatingCard doctorName={doctor.name} />
        </>
      ) : trialExpired ? (
        <Card className="bg-coral-50 dark:bg-coral-950 border-coral-200 dark:border-coral-800">
          <CardHeader
            title="Subscribe to be matched with a therapist"
            subtitle="Your free trial included a therapist match. Now that it's ended, a dedicated therapist requires a subscription. Free practice exercises remain available without a subscription."
          />
          <div className="flex flex-wrap gap-2">
            <Link href="/app/billing/success">
              <Button variant="coral">
                <Crown className="w-4 h-4" />
                Upgrade
              </Button>
            </Link>
            <Link href="/app/exercise/free">
              <Button variant="ghost">Continue with free practice</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="No therapist assigned"
            subtitle="Get auto-matched with the therapist who has the most availability."
          />
          <div className="flex flex-col gap-3">
            <Button onClick={autoMatch} loading={matching} size="lg">
              <Sparkles className="w-4 h-4" />
              Match me with a therapist
            </Button>
            <p className="text-xs text-ink-500">
              Or, if you'd rather not yet — free practice is fully available.
            </p>
            <Link href="/app/exercise/free" className="self-start">
              <Button variant="ghost">Browse exercises</Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
