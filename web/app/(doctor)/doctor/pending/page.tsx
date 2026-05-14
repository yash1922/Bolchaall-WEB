"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Hourglass, XCircle, Mail } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store";
import { formatDateTime } from "@/lib/utils";

const ADMIN_CONTACT = "admin@bolchall.demo";

export default function DoctorPendingPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const doctor = useAuthStore((s) => s.doctor);
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof api.doctorProfile>> | null>(null);

  // Poll /me every 15s to detect approval
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function refresh() {
      try {
        const me = await api.me();
        if (cancelled) return;
        setSession(me);
        if (me.doctor?.status === "approved") {
          router.replace("/doctor");
        }
      } catch {
        // ignore polling errors
      }
      try {
        const p = await api.doctorProfile();
        if (!cancelled) setProfile(p);
      } catch {
        // ignore
      }
    }

    refresh();
    timer = setInterval(refresh, 15_000);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [router, setSession]);

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size={28} />
      </div>
    );
  }

  const rejected = profile.status === "rejected";

  return (
    <div className="max-w-2xl mx-auto py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="text-center py-10">
          {rejected ? (
            <XCircle className="w-14 h-14 mx-auto mb-4 text-rose-500" />
          ) : (
            <Hourglass className="w-14 h-14 mx-auto mb-4 text-brand-500" />
          )}
          <h1 className="font-display text-3xl mb-2 text-ink-900 dark:text-ink-100">
            {rejected ? "Application not approved" : "Application under review"}
          </h1>
          <p className="text-sm text-ink-600 dark:text-ink-400 mb-1">
            Submitted {profile.submittedAt ? formatDateTime(profile.submittedAt) : "recently"}.
          </p>
          <div className="mt-4">
            <Badge variant={rejected ? "danger" : "warning"}>
              Status: {profile.status}
            </Badge>
          </div>

          {rejected && profile.adminRemarks ? (
            <div className="mt-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300 mb-1.5">
                Admin remarks
              </p>
              <p className="text-sm text-rose-900 dark:text-rose-200 whitespace-pre-wrap">
                {profile.adminRemarks}
              </p>
            </div>
          ) : (
            <p className="text-sm text-ink-600 dark:text-ink-400 mt-4 max-w-md mx-auto">
              An admin will verify your credentials and approve your account. This page refreshes
              automatically every 15 seconds.
            </p>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {rejected && (
              <Link href="/doctor/onboarding">
                <Button>Resubmit application</Button>
              </Link>
            )}
            <a
              href={`mailto:${ADMIN_CONTACT}`}
              className="inline-flex items-center gap-1.5 text-sm text-brand-700 dark:text-brand-300 hover:underline"
            >
              <Mail className="w-4 h-4" />
              {ADMIN_CONTACT}
            </a>
          </div>
        </Card>

        <Card className="mt-4">
          <CardHeader title="Submission summary" />
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Field label="Full name" value={profile.fullName} />
            <Field label="Phone" value={profile.phone} />
            <Field label="Qualification" value={profile.qualification} />
            <Field label="Specialization" value={profile.specialization} />
            <Field label="License" value={profile.license} mono />
            <Field label="Experience" value={`${profile.experienceYears} yr`} />
            <Field label="Clinic" value={profile.clinicName} />
            <Field label="LinkedIn" value={profile.linkedinUrl} link />
          </dl>
          {profile.bio && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-400 mb-1">
                Bio
              </p>
              <p className="text-sm text-ink-800 dark:text-ink-200">{profile.bio}</p>
            </div>
          )}
        </Card>
      </motion.div>

      {doctor /* avoid the var-unused warning */ && null}
    </div>
  );
}

function Field({ label, value, mono, link }: { label: string; value?: string; mono?: boolean; link?: boolean }) {
  if (!value) return null;
  return (
    <div className="border-b border-ink-100 dark:border-ink-800 py-1.5">
      <dt className="text-xs uppercase tracking-wider text-ink-500">{label}</dt>
      <dd className={`text-sm text-ink-900 dark:text-ink-100 ${mono ? "font-mono" : ""}`}>
        {link ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-brand-700 dark:text-brand-300 hover:underline break-all">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
