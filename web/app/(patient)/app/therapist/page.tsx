"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Stethoscope, MessageCircle, Sparkles, Crown, ArrowRightLeft, CheckCircle2, Star, Users } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { trialDaysLeft, isTrialExpired, cn } from "@/lib/utils";
import { TherapistRatingCard } from "@/components/patient/TherapistRatingCard";

type AvailableTherapist = Awaited<ReturnType<typeof api.patientAvailableTherapists>>[number];

export default function TherapistPage() {
  const { toast } = useToast();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.patientDashboard>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [available, setAvailable] = useState<AvailableTherapist[] | null>(null);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

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

  async function openPicker() {
    setPickerOpen(true);
    if (available === null) {
      setLoadingAvailable(true);
      try {
        const list = await api.patientAvailableTherapists();
        setAvailable(list);
      } catch (e) {
        toast({
          title: "Could not load therapists",
          description: e instanceof Error ? e.message : String(e),
          variant: "error",
        });
      } finally {
        setLoadingAvailable(false);
      }
    }
  }

  async function selectTherapist(t: AvailableTherapist) {
    if (t.isCurrent) {
      setPickerOpen(false);
      return;
    }
    setSwitching(t.userId);
    try {
      await api.patientSelectTherapist(t.userId);
      toast({ title: `You're now with ${t.name}`, variant: "success" });
      setPickerOpen(false);
      setAvailable(null); // force refresh next open
      await load();
    } catch (e) {
      toast({
        title: "Could not switch therapist",
        description: e instanceof Error ? e.message : String(e),
        variant: "error",
      });
    } finally {
      setSwitching(null);
    }
  }

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
            <div className="flex items-center gap-4 flex-wrap">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white shadow-soft shrink-0">
                <Stethoscope className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-[200px]">
                <h2 className="font-display text-2xl text-ink-900 dark:text-ink-100">{doctor.name}</h2>
                <p className="text-sm text-ink-600 dark:text-ink-400">{doctor.email}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" onClick={openPicker}>
                  <ArrowRightLeft className="w-4 h-4" />
                  Change therapist
                </Button>
                <Link href="/app/chat">
                  <Button>
                    <MessageCircle className="w-4 h-4" />
                    Open chat
                  </Button>
                </Link>
              </div>
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
            subtitle="Get auto-matched with the therapist who has the most availability, or pick one yourself."
          />
          <div className="flex flex-wrap gap-2 mb-3">
            <Button onClick={autoMatch} loading={matching} size="lg">
              <Sparkles className="w-4 h-4" />
              Auto-match me
            </Button>
            <Button onClick={openPicker} variant="outline" size="lg">
              <Users className="w-4 h-4" />
              Browse therapists
            </Button>
          </div>
          <Link href="/app/exercise/free" className="self-start">
            <Button variant="ghost">Or just browse exercises</Button>
          </Link>
        </Card>
      )}

      {/* Therapist picker modal */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="bg-white dark:bg-ink-900 rounded-2xl shadow-lift border border-ink-200 dark:border-ink-700 max-w-2xl w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-5 pb-3 border-b border-ink-200 dark:border-ink-700">
              <h2 className="font-display text-2xl text-ink-900 dark:text-ink-100">
                Choose your therapist
              </h2>
              <p className="text-sm text-ink-600 dark:text-ink-400">
                All therapists below are approved providers. You can change again any time.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loadingAvailable ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner size={24} />
                </div>
              ) : available && available.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {available.map((t) => (
                    <div
                      key={t.userId}
                      className={cn(
                        "rounded-xl border-2 p-4 transition",
                        t.isCurrent
                          ? "border-brand-400 bg-brand-50 dark:bg-brand-950"
                          : "border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 hover:border-brand-300"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-white flex items-center justify-center shrink-0">
                            <Stethoscope className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-display text-lg text-ink-900 dark:text-ink-100 truncate">
                              {t.name}
                              {t.isCurrent && (
                                <span className="ml-2 inline-flex items-center gap-1 text-xs font-sans font-semibold text-brand-700 dark:text-brand-300">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  current
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-ink-500 dark:text-ink-400 truncate">{t.email}</p>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-ink-600 dark:text-ink-400 flex-wrap">
                              {t.specialization && <span className="font-medium">{t.specialization}</span>}
                              {t.qualification && <span>· {t.qualification}</span>}
                              {t.experienceYears > 0 && <span>· {t.experienceYears} yrs exp</span>}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-ink-600 dark:text-ink-400">
                              {t.rating !== null && (
                                <span className="inline-flex items-center gap-0.5 text-gold-500">
                                  <Star className="w-3.5 h-3.5 fill-gold-500" />
                                  <span className="text-ink-700 dark:text-ink-300 font-medium">{t.rating.toFixed(1)}</span>
                                </span>
                              )}
                              <span>
                                {t.rosterCount} patient{t.rosterCount === 1 ? "" : "s"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={t.isCurrent ? "ghost" : "primary"}
                          disabled={t.isCurrent || switching !== null}
                          loading={switching === t.userId}
                          onClick={() => selectTherapist(t)}
                        >
                          {t.isCurrent ? "Selected" : "Pick"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-500 dark:text-ink-400 py-8 text-center">
                  No approved therapists available right now.
                </p>
              )}
            </div>
            <div className="px-6 py-3 border-t border-ink-200 dark:border-ink-700 flex justify-end">
              <Button variant="ghost" onClick={() => setPickerOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
