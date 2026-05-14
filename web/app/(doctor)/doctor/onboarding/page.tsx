"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Upload, X, FileCheck2, Stethoscope } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, FormField } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store";
import { uploadFileBase64 } from "@/lib/upload-helper";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;

interface FormState {
  fullName: string;
  phone: string;
  qualification: string;
  specialization: string;
  linkedinUrl: string;
  clinicName: string;
  license: string;
  experienceYears: string; // text in form, parsed on submit
  certifications: string; // comma-separated
  bio: string;
  govIdUrl: string;
  licenseDocUrl: string;
  certificationsUrls: string[];
}

const EMPTY: FormState = {
  fullName: "",
  phone: "",
  qualification: "",
  specialization: "",
  linkedinUrl: "",
  clinicName: "",
  license: "",
  experienceYears: "",
  certifications: "",
  bio: "",
  govIdUrl: "",
  licenseDocUrl: "",
  certificationsUrls: [],
};

export default function DoctorOnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // Pre-fill from existing profile (e.g. when resubmitting after rejection)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await api.doctorProfile();
        if (cancelled) return;
        setForm({
          fullName: p.fullName ?? user?.name ?? "",
          phone: p.phone ?? "",
          qualification: p.qualification ?? "",
          specialization: p.specialization ?? "",
          linkedinUrl: p.linkedinUrl ?? "",
          clinicName: p.clinicName ?? "",
          license: p.license ?? "",
          experienceYears: p.experienceYears > 0 ? String(p.experienceYears) : "",
          certifications: (p.certifications ?? []).join(", "),
          bio: p.bio ?? "",
          govIdUrl: p.govIdUrl ?? "",
          licenseDocUrl: p.licenseDocUrl ?? "",
          certificationsUrls: p.certificationsUrls ?? [],
        });
      } catch {
        // first-time visit — keep empty defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.name]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleFile(field: "govIdUrl" | "licenseDocUrl", file: File | null) {
    if (!file) return;
    setUploadingField(field);
    try {
      const url = await uploadFileBase64(file);
      update(field, url);
      toast({ title: "Uploaded", variant: "success" });
    } catch (e) {
      toast({
        title: "Upload failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "error",
      });
    } finally {
      setUploadingField(null);
    }
  }

  async function handleCertFile(file: File | null) {
    if (!file) return;
    setUploadingField("cert");
    try {
      const url = await uploadFileBase64(file);
      setForm((prev) => ({ ...prev, certificationsUrls: [...prev.certificationsUrls, url] }));
      toast({ title: "Certification uploaded", variant: "success" });
    } catch (e) {
      toast({
        title: "Upload failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "error",
      });
    } finally {
      setUploadingField(null);
    }
  }

  function step1Valid() {
    return (
      form.fullName.trim().length >= 2 &&
      form.phone.trim().length >= 7 &&
      form.qualification.trim().length >= 2 &&
      form.specialization.trim().length >= 2
    );
  }
  function step2Valid() {
    const years = Number(form.experienceYears);
    return (
      form.license.trim().length >= 2 &&
      Number.isFinite(years) &&
      years >= 0 &&
      years <= 70 &&
      form.bio.trim().length > 0
    );
  }
  function step3Valid() {
    return form.govIdUrl.length > 0 && form.licenseDocUrl.length > 0;
  }

  async function submit() {
    setSubmitting(true);
    try {
      const certs = form.certifications
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await api.doctorApply({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        qualification: form.qualification.trim(),
        specialization: form.specialization.trim(),
        linkedinUrl: form.linkedinUrl.trim(),
        clinicName: form.clinicName.trim(),
        license: form.license.trim(),
        experienceYears: Number(form.experienceYears),
        certifications: certs,
        bio: form.bio.trim(),
        govIdUrl: form.govIdUrl,
        licenseDocUrl: form.licenseDocUrl,
        certificationsUrls: form.certificationsUrls,
      });
      // Refresh session so layout sees the new status
      const me = await api.me();
      setSession(me);
      toast({ title: "Application submitted", description: "We'll review and get back to you.", variant: "success" });
      router.replace("/doctor/pending");
    } catch (e) {
      toast({
        title: "Could not submit",
        description: e instanceof Error ? e.message : String(e),
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white shadow-soft">
          <Stethoscope className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display text-3xl text-ink-900 dark:text-ink-100">Therapist application</h1>
          <p className="text-sm text-ink-600 dark:text-ink-400">
            Tell us about yourself so an admin can verify your credentials.
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-6">
        {([1, 2, 3] as const).map((n) => (
          <div key={n} className="flex-1 flex items-center gap-2">
            <div
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold",
                n <= step
                  ? "bg-brand-600 text-white"
                  : "bg-ink-100 dark:bg-ink-800 text-ink-500"
              )}
            >
              {n}
            </div>
            <span
              className={cn(
                "text-xs font-medium",
                n <= step ? "text-ink-900 dark:text-ink-100" : "text-ink-500"
              )}
            >
              {n === 1 ? "Identity" : n === 2 ? "Credentials" : "Documents"}
            </span>
            {n < 3 && (
              <div
                className={cn(
                  "h-0.5 flex-1 ml-1",
                  n < step ? "bg-brand-600" : "bg-ink-200 dark:bg-ink-700"
                )}
              />
            )}
          </div>
        ))}
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Card>
          {step === 1 && (
            <>
              <CardHeader title="About you" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Full name" htmlFor="fullName">
                  <Input
                    id="fullName"
                    required
                    value={form.fullName}
                    onChange={(e) => update("fullName", e.target.value)}
                    placeholder="Dr. Priya Sharma"
                  />
                </FormField>
                <FormField label="Email" htmlFor="email" hint="Your account email (locked).">
                  <Input id="email" disabled value={user?.email ?? ""} />
                </FormField>
                <FormField label="Phone number" htmlFor="phone">
                  <Input
                    id="phone"
                    required
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="+91 90000 00000"
                  />
                </FormField>
                <FormField label="Qualification" htmlFor="qualification">
                  <Input
                    id="qualification"
                    required
                    value={form.qualification}
                    onChange={(e) => update("qualification", e.target.value)}
                    placeholder="MASLP, MS in SLP, etc."
                  />
                </FormField>
                <FormField label="Specialization" htmlFor="specialization">
                  <Input
                    id="specialization"
                    required
                    value={form.specialization}
                    onChange={(e) => update("specialization", e.target.value)}
                    placeholder="Pediatric articulation, stroke recovery…"
                  />
                </FormField>
                <FormField label="LinkedIn (optional)" htmlFor="linkedinUrl">
                  <Input
                    id="linkedinUrl"
                    type="url"
                    value={form.linkedinUrl}
                    onChange={(e) => update("linkedinUrl", e.target.value)}
                    placeholder="https://linkedin.com/in/…"
                  />
                </FormField>
                <FormField label="Clinic / hospital (optional)" htmlFor="clinicName">
                  <Input
                    id="clinicName"
                    value={form.clinicName}
                    onChange={(e) => update("clinicName", e.target.value)}
                    placeholder="Where do you currently practice?"
                  />
                </FormField>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader title="Professional credentials" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="License number" htmlFor="license">
                  <Input
                    id="license"
                    required
                    value={form.license}
                    onChange={(e) => update("license", e.target.value)}
                    placeholder="SLP-IN-2018-4421"
                  />
                </FormField>
                <FormField label="Years of experience" htmlFor="experienceYears">
                  <Input
                    id="experienceYears"
                    required
                    type="number"
                    min={0}
                    max={70}
                    value={form.experienceYears}
                    onChange={(e) => update("experienceYears", e.target.value)}
                  />
                </FormField>
                <FormField
                  label="Certifications (comma-separated)"
                  htmlFor="certifications"
                  hint='e.g. "MASLP, ASHA-CCC-SLP". You can attach files in the next step.'
                >
                  <Input
                    id="certifications"
                    value={form.certifications}
                    onChange={(e) => update("certifications", e.target.value)}
                    placeholder="MASLP, ASHA-CCC-SLP"
                  />
                </FormField>
                <FormField label="Short bio" htmlFor="bio" hint="2–3 sentences for your patients.">
                  <textarea
                    id="bio"
                    required
                    value={form.bio}
                    onChange={(e) => update("bio", e.target.value)}
                    rows={4}
                    className="flex w-full rounded-xl bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-700 px-4 py-2 text-sm text-ink-900 dark:text-ink-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                  />
                </FormField>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader title="Upload documents" subtitle="Up to 2 MB each. JPG, PNG, PDF accepted." />
              <div className="flex flex-col gap-5">
                <FileSlot
                  label="Government ID *"
                  url={form.govIdUrl}
                  busy={uploadingField === "govIdUrl"}
                  onPick={(f) => handleFile("govIdUrl", f)}
                  onClear={() => update("govIdUrl", "")}
                />
                <FileSlot
                  label="License document *"
                  url={form.licenseDocUrl}
                  busy={uploadingField === "licenseDocUrl"}
                  onPick={(f) => handleFile("licenseDocUrl", f)}
                  onClear={() => update("licenseDocUrl", "")}
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-400 mb-2">
                    Certification documents (optional)
                  </p>
                  <div className="flex flex-col gap-2 mb-2">
                    {form.certificationsUrls.map((u, i) => (
                      <div
                        key={u}
                        className="flex items-center justify-between text-sm rounded-lg border border-ink-200 dark:border-ink-700 px-3 py-2 bg-ink-100/50 dark:bg-ink-800/50"
                      >
                        <a
                          href={u}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-700 dark:text-brand-300 hover:underline truncate"
                        >
                          Certification #{i + 1}
                        </a>
                        <button
                          type="button"
                          aria-label="Remove"
                          onClick={() =>
                            setForm((p) => ({
                              ...p,
                              certificationsUrls: p.certificationsUrls.filter((x) => x !== u),
                            }))
                          }
                          className="p-1 rounded hover:bg-ink-200 dark:hover:bg-ink-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => handleCertFile(e.target.files?.[0] ?? null)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      loading={uploadingField === "cert"}
                      onClick={(e) => {
                        e.preventDefault();
                        (e.currentTarget.previousSibling as HTMLInputElement)?.click();
                      }}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Add a certification
                    </Button>
                  </label>
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-ink-200 dark:border-ink-700">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
              disabled={step === 1}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => (s + 1) as Step)}
                disabled={(step === 1 && !step1Valid()) || (step === 2 && !step2Valid())}
              >
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={submit} loading={submitting} disabled={!step3Valid()}>
                Submit application
              </Button>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

function FileSlot({
  label,
  url,
  busy,
  onPick,
  onClear,
}: {
  label: string;
  url: string;
  busy: boolean;
  onPick: (f: File | null) => void;
  onClear: () => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-400 mb-2">
        {label}
      </p>
      {url ? (
        <div className="flex items-center justify-between text-sm rounded-lg border border-emerald-200 dark:border-emerald-800 px-3 py-2 bg-emerald-50 dark:bg-emerald-950">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 dark:text-emerald-300 hover:underline inline-flex items-center gap-2"
          >
            <FileCheck2 className="w-4 h-4" />
            Uploaded — preview
          </a>
          <button
            type="button"
            onClick={onClear}
            className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900"
            aria-label="Replace"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={busy}
            onClick={(e) => {
              e.preventDefault();
              (e.currentTarget.previousSibling as HTMLInputElement)?.click();
            }}
          >
            <Upload className="w-3.5 h-3.5" />
            Choose file
          </Button>
        </label>
      )}
    </div>
  );
}
