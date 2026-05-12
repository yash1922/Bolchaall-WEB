"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api-client";
import type { PhonemeWordDTO } from "shared";
import { cn } from "@/lib/utils";

export default function PhonemesPage() {
  const [list, setList] = useState<PhonemeWordDTO[] | null>(null);
  const [language, setLanguage] = useState<"all" | "en" | "hi">("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await api.listPhonemes();
        if (!cancelled) setList(d);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!list) return [];
    return language === "all" ? list : list.filter((p) => p.language === language);
  }, [list, language]);

  const grouped = useMemo(() => {
    const m = new Map<string, PhonemeWordDTO[]>();
    for (const p of filtered) {
      const arr = m.get(p.category) ?? [];
      arr.push(p);
      m.set(p.category, arr);
    }
    return Array.from(m.entries());
  }, [filtered]);

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
        <h1 className="font-display text-3xl mb-1">Phoneme directory</h1>
        <p className="text-sm text-ink-600">
          {list.length} phonemes with articulation tips and a 2D mouth diagram for each.
        </p>
      </div>

      <div className="flex items-center gap-2">
        {(["all", "en", "hi"] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => setLanguage(opt)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs uppercase tracking-wider transition border",
              language === opt
                ? "bg-brand-100 border-brand-300 text-ink-900"
                : "bg-white border-ink-200 text-ink-600 hover:border-ink-300"
            )}
          >
            {opt === "all" ? "All" : opt === "en" ? "English" : "Hindi"}
          </button>
        ))}
      </div>

      {grouped.map(([category, items]) => (
        <Card key={category}>
          <CardHeader title={category} subtitle={`${items.length} phoneme${items.length === 1 ? "" : "s"}`} />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {items.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.02 }}
              >
                <Link
                  href={`/app/phonemes/${p.id}`}
                  className="flex flex-col items-center justify-center gap-1 rounded-xl border border-ink-200 bg-white hover:bg-brand-500/10 hover:border-brand-200 p-3 transition aspect-square"
                >
                  <span className="font-mono text-lg text-ink-900">{p.ipa}</span>
                  <span className="text-xs text-ink-600">{p.label}</span>
                  {p.voicing && (
                    <Badge variant="info" className="mt-1 text-[10px]">
                      voiced
                    </Badge>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
