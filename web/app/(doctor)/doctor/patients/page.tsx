"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, Flame } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";

type Patient = Awaited<ReturnType<typeof api.doctorPatients>>[number];
type Available = Awaited<ReturnType<typeof api.doctorAvailablePatients>>[number];

export default function DoctorPatientsPage() {
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[] | null>(null);
  const [available, setAvailable] = useState<Available[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [p, a] = await Promise.all([api.doctorPatients(), api.doctorAvailablePatients()]);
      setPatients(p);
      setAvailable(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function claim(userId: string, name: string) {
    try {
      await api.doctorClaim(userId);
      toast({ title: `Claimed ${name}`, variant: "success" });
      load();
    } catch (e) {
      toast({ title: "Could not claim", description: String(e), variant: "error" });
    }
  }

  if (error)
    return (
      <Card>
        <p className="text-rose-600">{error}</p>
      </Card>
    );
  if (!patients || !available)
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size={28} />
      </div>
    );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl mb-1">Patient roster</h1>
        <p className="text-sm text-ink-600">
          {patients.length} active · {available.length} unassigned available
        </p>
      </div>

      <Card>
        <CardHeader title="Your patients" />
        {patients.length === 0 ? (
          <p className="text-sm text-ink-500 py-6 text-center">
            No patients yet. Claim one from the available list below.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {patients.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
              >
                <Link href={`/doctor/patients/${p.userId}`}>
                  <Card className="hover:border-brand-200 hover:bg-brand-500/5 transition cursor-pointer">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-lg">{p.name}</p>
                        <p className="text-xs text-ink-500">{p.email}</p>
                      </div>
                      <Badge variant={p.subscriptionStatus === "active" ? "success" : "trial"}>
                        {p.subscriptionStatus}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-3 text-xs text-ink-600">
                      <span className="inline-flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-orange-400" />
                        {p.streakDays}d
                      </span>
                      <span>{p.xp} XP</span>
                      <span>{p.coins} coins</span>
                    </div>
                    {p.conditions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.conditions.map((c) => (
                          <Badge key={c} variant="muted">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {available.length > 0 && (
        <Card>
          <CardHeader
            title="Available patients"
            subtitle="No therapist assigned yet — claim them to add to your roster."
          />
          <div className="flex flex-col gap-2">
            {available.map((a) => (
              <div
                key={a.userId}
                className="flex items-center justify-between rounded-xl border border-ink-200 bg-white p-3"
              >
                <div>
                  <p className="text-sm">{a.name}</p>
                  <p className="text-xs text-ink-500">{a.email}</p>
                  {a.conditions.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {a.conditions.map((c) => (
                        <Badge key={c} variant="muted" className="text-[10px]">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button size="sm" onClick={() => claim(a.userId, a.name)}>
                  <Users className="w-4 h-4" />
                  Claim
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
