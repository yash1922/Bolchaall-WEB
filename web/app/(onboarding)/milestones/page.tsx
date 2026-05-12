"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const CONDITIONS = [
  "stroke recovery",
  "articulation disorder",
  "stuttering / fluency",
  "voice / hoarseness",
  "accent modification",
  "general practice",
];

export default function MilestonesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const setSession = useAuthStore((s) => s.setSession);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function toggle(c: string) {
    setSelected((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  async function finish() {
    setSubmitting(true);
    try {
      const language = (sessionStorage.getItem("onboarding.language") ?? "en") as "en" | "hi";
      await api.completeOnboarding({ language, conditions: selected });
      const me = await api.me();
      setSession(me);
      toast({ title: "All set — let's start practicing", variant: "success" });
      router.replace("/app");
    } catch (e) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : String(e),
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-lg w-full"
    >
      <Card>
        <CardHeader
          title="What brings you here?"
          subtitle="Step 3b of 3 — pick any that apply (or none)."
        />
        <div className="grid grid-cols-2 gap-2 mb-6">
          {CONDITIONS.map((c) => (
            <button
              key={c}
              onClick={() => toggle(c)}
              className={cn(
                "rounded-xl border p-3 text-left text-sm transition",
                selected.includes(c)
                  ? "border-brand-400 bg-brand-500/15 text-ink-900"
                  : "border-ink-200 bg-white text-ink-600 hover:border-ink-300"
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <Button onClick={finish} className="w-full" loading={submitting}>
          Finish setup
        </Button>
      </Card>
    </motion.div>
  );
}
