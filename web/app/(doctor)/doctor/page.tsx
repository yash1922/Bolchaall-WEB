"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, ClipboardList, TrendingUp, Star } from "lucide-react";
import { Card, CardHeader, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store";

export default function DoctorDashboard() {
  const doctor = useAuthStore((s) => s.doctor);
  const [data, setData] = useState<Awaited<ReturnType<typeof api.doctorDashboard>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await api.doctorDashboard();
        if (!cancelled) setData(d);
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
  if (!data)
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size={28} />
      </div>
    );

  const pending = doctor?.status !== "approved";

  return (
    <div className="flex flex-col gap-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="font-display text-3xl mb-1">Therapist dashboard</h1>
        <p className="text-sm text-ink-600">
          {pending ? "Your application is under review." : "Here's how your patients are doing."}
        </p>
      </motion.div>

      {pending && (
        <Card>
          <CardHeader
            title="Pending review"
            subtitle="An admin will approve your account soon. In the meantime, you can browse exercises."
            action={<Badge variant="warning">{doctor?.status}</Badge>}
          />
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Patients"
          value={data.patientsCount}
          hint="In your roster"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          label="Open assignments"
          value={data.assignmentsOpen}
          hint="Waiting completion"
          icon={<ClipboardList className="w-5 h-5" />}
        />
        <StatCard
          label="Avg recent score"
          value={data.avgRecentScore !== null ? `${data.avgRecentScore}` : "—"}
          hint="Last 20 attempts"
          icon={<TrendingUp className="w-5 h-5" />}
          trend="up"
        />
        <StatCard
          label="Rating"
          value={data.doctor.rating.toFixed(1)}
          hint="From your patients"
          icon={<Star className="w-5 h-5 text-gold-400" />}
        />
      </div>

      <Card>
        <CardHeader title="Quick actions" />
        <div className="flex flex-wrap gap-2">
          <Link href="/doctor/patients">
            <Button variant="glass">View patient roster</Button>
          </Link>
          <Link href="/doctor/exercises">
            <Button variant="glass">Browse exercise library</Button>
          </Link>
          <Link href="/doctor/chat">
            <Button variant="glass">Open chat</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
