"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { MouthDiagram } from "@/components/phonemes/MouthDiagram";
import { api } from "@/lib/api-client";
import type { PhonemeWordDTO } from "shared";

export default function PhonemeDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [p, setP] = useState<PhonemeWordDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await api.getPhoneme(params.id);
        if (!cancelled) setP(d);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (error)
    return (
      <Card>
        <p className="text-rose-300">{error}</p>
      </Card>
    );
  if (!p)
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size={28} />
      </div>
    );

  function speakWord(word: string) {
    if (typeof window === "undefined") return;
    const u = new SpeechSynthesisUtterance(word);
    u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="self-start">
        <ArrowLeft className="w-4 h-4" />
        Back to directory
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-baseline gap-4 mb-2">
          <span className="font-mono text-5xl text-cosmic-100">{p.ipa}</span>
          <span className="font-display text-3xl">{p.label}</span>
          <Badge variant={p.language === "en" ? "primary" : "info"}>
            {p.language === "en" ? "English" : "Hindi"}
          </Badge>
          {p.voicing && <Badge variant="success">voiced</Badge>}
        </div>
        <p className="text-sm text-cosmic-300/70">{p.category}</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Articulation" subtitle="Tongue, lips, voicing" />
          <MouthDiagram
            tonguePosition={p.tonguePosition}
            lipShape={p.lipShape}
            voicing={p.voicing}
            className="w-full max-w-md mx-auto"
          />
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg bg-white/5 border border-white/10 p-2">
              <p className="uppercase tracking-wider text-cosmic-300/60">Place</p>
              <p className="text-cosmic-100 mt-0.5">{p.place || "—"}</p>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-2">
              <p className="uppercase tracking-wider text-cosmic-300/60">Manner</p>
              <p className="text-cosmic-100 mt-0.5">{p.manner || "—"}</p>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-2">
              <p className="uppercase tracking-wider text-cosmic-300/60">Tongue</p>
              <p className="text-cosmic-100 mt-0.5 capitalize">{p.tonguePosition}</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="How to say it" />
          <p className="text-sm text-cosmic-100/90 leading-relaxed mb-6">{p.articulationTip}</p>

          <CardHeader title="Sample words" subtitle="Click to hear (browser TTS)" />
          <div className="flex flex-wrap gap-2">
            {p.sampleWords.map((w) => (
              <button
                key={w}
                onClick={() => speakWord(w)}
                className="px-3 py-1.5 rounded-lg bg-cosmic-500/15 border border-cosmic-400/30 text-cosmic-100 hover:bg-cosmic-500/25 transition text-sm"
              >
                {w}
              </button>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-white/5">
            <Link href="/app/exercise/free">
              <Button>Practice now</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
