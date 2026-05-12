"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, ShieldCheck, Crown, DollarSign, UserCheck } from "lucide-react";
import { Card, CardHeader, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api-client";

export default function AdminOverview() {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.adminAnalytics>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await api.adminAnalytics();
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

  const conversionRate =
    data.trialPatients + data.paidPatients > 0
      ? Math.round((data.paidPatients / (data.trialPatients + data.paidPatients)) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="font-display text-3xl mb-1">Platform overview</h1>
        <p className="text-sm text-ink-600">Live KPIs from the database.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total users"
          value={data.totalUsers}
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          label="Active patients"
          value={data.activePatients}
          icon={<UserCheck className="w-5 h-5" />}
          trend="up"
        />
        <StatCard
          label="On trial"
          value={data.trialPatients}
          icon={<Crown className="w-5 h-5" />}
        />
        <StatCard
          label="Approved doctors"
          value={data.approvedDoctors}
          icon={<ShieldCheck className="w-5 h-5" />}
        />
        <StatCard
          label="MRR (demo)"
          value={`$${data.monthlyRevenueDemo.toLocaleString()}`}
          icon={<DollarSign className="w-5 h-5" />}
          trend="up"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Trial conversion" subtitle="Paid / (trial + paid)" />
          <p className="font-display text-5xl">{conversionRate}%</p>
          <p className="text-xs text-ink-500 mt-1">
            {data.paidPatients} paid · {data.trialPatients} on trial
          </p>
        </Card>
        <Card>
          <CardHeader
            title="Pending applications"
            subtitle="Doctors waiting for review"
            action={data.pendingApplications > 0 && <Badge variant="warning">{data.pendingApplications}</Badge>}
          />
          {data.pendingApplications > 0 ? (
            <Link href="/admin/applications">
              <Button>Review queue</Button>
            </Link>
          ) : (
            <p className="text-sm text-ink-500">All caught up.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
