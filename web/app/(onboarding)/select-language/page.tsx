"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { code: "en", label: "English", hint: "Full library — 36+ phonemes." },
  { code: "hi", label: "हिन्दी (Hindi)", hint: "Bilingual support — 5+ Hindi phonemes." },
] as const;

export default function SelectLanguagePage() {
  const router = useRouter();
  const [pick, setPick] = useState<"en" | "hi">("en");

  function next() {
    sessionStorage.setItem("onboarding.language", pick);
    router.push("/capture-name");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-md w-full"
    >
      <Card>
        <CardHeader title="Pick a language" subtitle="Step 2 of 3 — you can change this later." />
        <div className="flex flex-col gap-3 mb-6">
          {OPTIONS.map((opt) => (
            <button
              key={opt.code}
              onClick={() => setPick(opt.code)}
              className={cn(
                "rounded-xl border p-4 text-left transition",
                pick === opt.code
                  ? "border-brand-400 bg-brand-500/15"
                  : "border-ink-200 bg-white hover:border-ink-300"
              )}
            >
              <p className="font-display text-lg">{opt.label}</p>
              <p className="text-xs text-ink-600 mt-1">{opt.hint}</p>
            </button>
          ))}
        </div>
        <Button onClick={next} className="w-full">
          Continue
        </Button>
      </Card>
    </motion.div>
  );
}
