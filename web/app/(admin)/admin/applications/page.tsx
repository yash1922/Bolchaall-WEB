"use client";

import { useEffect, useState } from "react";
import { Check, X, ShieldCheck, FileText, ExternalLink } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { formatRelative } from "@/lib/utils";

type App = Awaited<ReturnType<typeof api.adminApplications>>[number];

export default function ApplicationsPage() {
  const { toast } = useToast();
  const [list, setList] = useState<App[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remarksById, setRemarksById] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    try {
      const d = await api.adminApplications();
      setList(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(a: App, decision: "approve" | "reject") {
    const remarks = (remarksById[a.id] ?? "").trim();
    if (decision === "reject" && remarks.length === 0) {
      toast({
        title: "Remarks required to reject",
        description: "Tell the therapist what to fix before resubmitting.",
        variant: "error",
      });
      return;
    }
    setBusy(a.id);
    try {
      await api.adminDecide(a.id, decision, remarks);
      toast({
        title: `${decision === "approve" ? "Approved" : "Rejected"} ${a.name}`,
        variant: "success",
      });
      setRemarksById((r) => {
        const next = { ...r };
        delete next[a.id];
        return next;
      });
      await load();
    } catch (e) {
      toast({
        title: "Could not update",
        description: e instanceof Error ? e.message : String(e),
        variant: "error",
      });
    } finally {
      setBusy(null);
    }
  }

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
        <h1 className="font-display text-3xl mb-1">Doctor applications</h1>
        <p className="text-sm text-ink-600 dark:text-ink-400">
          {list.length} pending review.
        </p>
      </div>

      {list.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-500 py-6 text-center">No pending applications.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {list.map((a) => (
            <Card key={a.id}>
              <CardHeader
                title={
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-brand-500" />
                    {a.fullName || a.name}
                  </span>
                }
                subtitle={`${a.email} · ${a.phone || "no phone"} · applied ${formatRelative(a.appliedAt)}`}
                action={<Badge variant="warning">pending</Badge>}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <Field label="Qualification" value={a.qualification} />
                <Field label="Specialization" value={a.specialization} />
                <Field label="Experience" value={`${a.experienceYears} yr`} />
                <Field label="License #" value={a.license} mono />
                <Field label="Clinic" value={a.clinicName} />
                <Field label="LinkedIn" value={a.linkedinUrl} link />
                <div className="md:col-span-3">
                  <p className="text-xs uppercase tracking-wider text-ink-500">Certifications</p>
                  <p className="text-ink-900 dark:text-ink-100 mt-0.5">
                    {a.certifications.length > 0 ? a.certifications.join(", ") : "—"}
                  </p>
                </div>
              </div>

              {a.bio && (
                <div className="mt-3">
                  <p className="text-xs uppercase tracking-wider text-ink-500 mb-1">Bio</p>
                  <p className="text-sm text-ink-800 dark:text-ink-200 whitespace-pre-wrap">{a.bio}</p>
                </div>
              )}

              {/* Documents */}
              <div className="mt-4 pt-4 border-t border-ink-200 dark:border-ink-700">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-400 mb-2">
                  Submitted documents
                </p>
                <div className="flex flex-wrap gap-2">
                  <DocLink label="Government ID" url={a.govIdUrl} />
                  <DocLink label="License document" url={a.licenseDocUrl} />
                  {a.certificationsUrls.map((u, i) => (
                    <DocLink key={u} label={`Certification ${i + 1}`} url={u} />
                  ))}
                  {!a.govIdUrl && !a.licenseDocUrl && a.certificationsUrls.length === 0 && (
                    <p className="text-sm text-ink-500">No documents uploaded.</p>
                  )}
                </div>
              </div>

              {/* Remarks + decision */}
              <div className="mt-4 pt-4 border-t border-ink-200 dark:border-ink-700">
                <label
                  htmlFor={`remarks-${a.id}`}
                  className="text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-400 mb-2 block"
                >
                  Remarks (required to reject; visible to the therapist)
                </label>
                <textarea
                  id={`remarks-${a.id}`}
                  rows={2}
                  value={remarksById[a.id] ?? ""}
                  onChange={(e) =>
                    setRemarksById((r) => ({ ...r, [a.id]: e.target.value }))
                  }
                  placeholder="e.g. License image is unreadable — please re-upload."
                  className="flex w-full rounded-xl bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-700 px-3 py-2 text-sm text-ink-900 dark:text-ink-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                />
                <div className="flex items-center justify-end gap-2 mt-3">
                  <Button
                    onClick={() => decide(a, "reject")}
                    size="sm"
                    variant="ghost"
                    loading={busy === a.id}
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => decide(a, "approve")}
                    size="sm"
                    loading={busy === a.id}
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono, link }: { label: string; value?: string; mono?: boolean; link?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-ink-500">{label}</p>
      <p className={`mt-0.5 ${mono ? "font-mono text-xs" : ""} text-ink-900 dark:text-ink-100`}>
        {!value ? (
          "—"
        ) : link ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-700 dark:text-brand-300 hover:underline break-all"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </p>
    </div>
  );
}

function DocLink({ label, url }: { label: string; url: string | null }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 px-3 py-1.5 hover:bg-brand-100 dark:hover:bg-brand-900 transition"
    >
      <FileText className="w-3.5 h-3.5" />
      {label}
      <ExternalLink className="w-3 h-3 opacity-70" />
    </a>
  );
}
