"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw, Sparkles, Volume2, XCircle } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store";
import { playApplause, playChime } from "@/lib/sounds";
import { cn } from "@/lib/utils";

/**
 * Each round picks a target word, splits it into phoneme-like chunks,
 * plays each chunk separately via TTS, and asks the player to pick the
 * full word from 4 options.
 *
 * For each chunk we provide both:
 *   - `display`: shown on screen (e.g. "/sh/")
 *   - `spoken`: the string passed to SpeechSynthesis. Browser TTS spells
 *     short letter pairs ("sh" -> "S-H") instead of pronouncing the sound,
 *     so we use phonetic approximations that engines actually pronounce
 *     correctly (e.g. "shhh" sounds like /ʃ/, "thuh" sounds like /θ/, etc.).
 */
type Chunk = { display: string; spoken: string };
type Round = { word: string; chunks: Chunk[]; distractors: string[] };

// Maps a written chunk to its TTS-friendly form. Add to this as we discover
// digraphs that don't pronounce naturally on Chrome / Safari / Firefox voices.
const SPOKEN: Record<string, string> = {
  // Vowels — TTS often spells single letters; pad with extra vowel sound.
  a: "ahh",
  e: "ehh",
  i: "ihh",
  o: "ahh",
  u: "uhh",
  // Long vowels
  ee: "eeee",
  oo: "ooooh",
  ay: "ay",
  // Consonants — single letters TTS will spell, so use phonetic stretch.
  b: "buh",
  c: "kuh",
  d: "duh",
  f: "fuh",
  g: "guh",
  h: "huh",
  k: "kuh",
  l: "luh",
  m: "mmm",
  n: "nnn",
  p: "puh",
  r: "ruh",
  s: "sss",
  t: "tuh",
  v: "vuh",
  w: "wuh",
  // Digraphs — the main culprits for letter-spelling.
  sh: "shhh",
  ch: "chuh",
  th: "thuh",
  ph: "fuh",
  ng: "ngg",
  // Consonant clusters at end of word
  lk: "luhk",
  nd: "nduh",
  st: "stuh",
};

function chunk(d: string): Chunk {
  return { display: d, spoken: SPOKEN[d] ?? d };
}

const ROUND_BANK: Round[] = [
  { word: "cat",  chunks: ["c", "a", "t"].map(chunk),       distractors: ["bat", "cap", "cab"] },
  { word: "dog",  chunks: ["d", "o", "g"].map(chunk),       distractors: ["dot", "log", "dig"] },
  { word: "fish", chunks: ["f", "i", "sh"].map(chunk),      distractors: ["dish", "fist", "wish"] },
  { word: "ship", chunks: ["sh", "i", "p"].map(chunk),      distractors: ["chip", "sip", "skip"] },
  { word: "milk", chunks: ["m", "i", "lk"].map(chunk),      distractors: ["silk", "mink", "milt"] },
  { word: "frog", chunks: ["f", "r", "o", "g"].map(chunk),  distractors: ["flog", "frock", "from"] },
  { word: "hand", chunks: ["h", "a", "n", "d"].map(chunk),  distractors: ["band", "hang", "land"] },
  { word: "star", chunks: ["s", "t", "a", "r"].map(chunk),  distractors: ["spar", "stir", "stab"] },
  { word: "book", chunks: ["b", "oo", "k"].map(chunk),      distractors: ["boot", "look", "back"] },
  { word: "tree", chunks: ["t", "r", "ee"].map(chunk),      distractors: ["three", "free", "trick"] },
];

const ROUNDS_PER_GAME = 6;

export default function PhonemeBlendingGame() {
  const { toast } = useToast();
  const patchPatient = useAuthStore((s) => s.patchPatient);

  const [rounds, setRounds] = useState<Round[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState(false);

  // Build a fresh round set per game session
  useEffect(() => {
    setRounds(shuffle(ROUND_BANK).slice(0, ROUNDS_PER_GAME));
  }, []);

  const round = rounds[idx];
  const options = useMemo(() => {
    if (!round) return [];
    return shuffle([round.word, ...round.distractors]);
  }, [round]);

  function speak(text: string, rate = 0.8) {
    if (typeof window === "undefined") return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  function playChunks() {
    if (!round) return;
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    round.chunks.forEach((c, i) => {
      // Use the TTS-friendly `spoken` form so digraphs aren't spelled out.
      const u = new SpeechSynthesisUtterance(c.spoken);
      u.rate = 0.7;
      u.pitch = 1.0;
      // Stagger so they're heard as discrete sounds
      setTimeout(() => window.speechSynthesis.speak(u), i * 800);
    });
  }

  async function pick(option: string) {
    if (picked || !round) return;
    setPicked(option);
    const isRight = option === round.word;
    if (isRight) {
      setCorrectCount((n) => n + 1);
      playApplause("soft");
    }
    speak(round.word, 0.85);
    setTimeout(() => {
      const next = idx + 1;
      if (next >= rounds.length) {
        finishGame(isRight ? correctCount + 1 : correctCount);
      } else {
        setIdx(next);
        setPicked(null);
      }
    }, 1100);
  }

  async function finishGame(finalCorrect: number) {
    setFinished(true);
    setBusy(true);
    try {
      const r = await api.submitActivityScore({
        activity: "phoneme_blending",
        correct: finalCorrect,
        total: rounds.length,
      });
      patchPatient({ xp: r.totalXp, coins: r.totalCoins, streakDays: r.streakDays });
      toast({
        title: `${r.accuracy}% — +${r.xpGained} XP, +${r.coinsGained} coins`,
        description: `${finalCorrect} of ${rounds.length} blended correctly`,
        variant: "success",
      });
      if (r.accuracy >= 80) playChime();
    } catch (e) {
      toast({
        title: "Could not save your score",
        description: e instanceof Error ? e.message : String(e),
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    setRounds(shuffle(ROUND_BANK).slice(0, ROUNDS_PER_GAME));
    setIdx(0);
    setPicked(null);
    setCorrectCount(0);
    setFinished(false);
  }

  if (rounds.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-sm text-ink-500">Loading…</div>
      </div>
    );
  }

  if (finished) {
    const accuracy = Math.round((correctCount / rounds.length) * 100);
    return (
      <div className="flex flex-col gap-6">
        <Link href="/app/activities" className="text-sm text-ink-600 dark:text-ink-400 hover:underline self-start inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Back to activities
        </Link>
        <Card className="text-center py-12">
          <Sparkles className="w-12 h-12 mx-auto mb-3 text-gold-500" />
          <h2 className="font-display text-3xl text-ink-900 dark:text-ink-100 mb-1">
            {accuracy}%
          </h2>
          <p className="text-sm text-ink-600 dark:text-ink-400 mb-6">
            {correctCount} of {rounds.length} blended correctly
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button onClick={restart} disabled={busy}>
              <RotateCcw className="w-4 h-4" />
              Play again
            </Button>
            <Link href="/app/activities">
              <Button variant="ghost">
                Other activities
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/app/activities" className="text-sm text-ink-600 dark:text-ink-400 hover:underline self-start inline-flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" />
        Back to activities
      </Link>

      <div>
        <h1 className="font-display text-3xl text-ink-900 dark:text-ink-100 mb-1">
          Phoneme blending
        </h1>
        <p className="text-sm text-ink-600 dark:text-ink-400">
          Round {idx + 1} of {rounds.length} · {correctCount} correct so far
        </p>
        <div className="h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden mt-3">
          <div
            className="h-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all"
            style={{ width: `${((idx + (picked ? 1 : 0)) / rounds.length) * 100}%` }}
          />
        </div>
      </div>

      <Card>
        <CardHeader
          title="Listen to the sounds, then pick the word"
          subtitle="Tap the play button to hear the chunks one by one. Pick the word they spell."
          action={<Badge variant="primary">Round {idx + 1}</Badge>}
        />
        <div className="flex flex-col items-center gap-4 py-2">
          <Button onClick={playChunks} variant="primary" size="lg">
            <Volume2 className="w-5 h-5" />
            Play sounds
          </Button>
          <div className="flex gap-1.5 flex-wrap justify-center text-ink-500 dark:text-ink-400 text-sm">
            {round?.chunks.map((c, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded bg-ink-100 dark:bg-ink-800 font-mono"
                title="One sound chunk"
              >
                /{c.display}/
              </span>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <AnimatePresence mode="popLayout">
          {options.map((opt, i) => {
            const isCorrect = picked && opt === round!.word;
            const isWrongPick = picked === opt && opt !== round!.word;
            return (
              <motion.button
                key={`${opt}-${idx}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
                disabled={!!picked}
                onClick={() => pick(opt)}
                className={cn(
                  "rounded-xl border-2 p-5 text-left transition disabled:cursor-default",
                  isCorrect
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
                    : isWrongPick
                    ? "border-rose-500 bg-rose-50 dark:bg-rose-950"
                    : picked
                    ? "border-ink-200 dark:border-ink-700 opacity-60"
                    : "border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-ink-800"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-2xl text-ink-900 dark:text-ink-100">
                    {opt}
                  </span>
                  {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  {isWrongPick && <XCircle className="w-5 h-5 text-rose-600" />}
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return out;
}
