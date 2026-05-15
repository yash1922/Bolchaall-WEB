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
 * "Say the word, then drop a sound. What word is left?"
 *
 * Each round picks a target word, removes one phoneme-like chunk, and
 * asks the player to identify the resulting word from 4 options.
 *
 * Per UX request: we DO NOT play the whole word back — only the sound
 * to drop. The patient sees the word written and hears the target sound.
 * For that one sound to actually pronounce (vs being spelled), we use a
 * phonetic stretch ("buh", "shhh") instead of the bare letter.
 */
const SPOKEN_SOUND: Record<string, string> = {
  b: "buh", c: "kuh", d: "duh", f: "fuh", g: "guh", h: "huh",
  k: "kuh", l: "luh", m: "mmm", n: "nnn", p: "puh", r: "ruh",
  s: "sss", t: "tuh", v: "vuh", w: "wuh",
  sh: "shhh", ch: "chuh", th: "thuh", ph: "fuh",
};

const ROUND_BANK: Array<{
  word: string;
  drop: string;            // chunk to remove
  result: string;          // the resulting word
  prompt: string;          // human-readable prompt
  distractors: string[];
}> = [
  { word: "cart",  drop: "c", result: "art",  prompt: "Say 'cart'. Now drop the /k/ sound.",  distractors: ["car", "art", "tar", "rat"].filter((x) => x !== "art") },
  { word: "stop",  drop: "s", result: "top",  prompt: "Say 'stop'. Now drop the /s/ sound.",  distractors: ["stop", "tip", "pot"].filter((x) => x !== "top") },
  { word: "play",  drop: "p", result: "lay",  prompt: "Say 'play'. Now drop the /p/ sound.",  distractors: ["pay", "lay", "ply", "lap"].filter((x) => x !== "lay") },
  { word: "snail", drop: "s", result: "nail", prompt: "Say 'snail'. Now drop the /s/ sound.", distractors: ["sail", "nail", "tail", "snip"].filter((x) => x !== "nail") },
  { word: "frog",  drop: "f", result: "rog",  prompt: "Say 'frog'. Now drop the /f/ sound.",  distractors: ["frog", "fog", "rog", "gor"].filter((x) => x !== "rog") },
  { word: "track", drop: "t", result: "rack", prompt: "Say 'track'. Now drop the /t/ sound.", distractors: ["rack", "tack", "trick", "rock"].filter((x) => x !== "rack") },
  { word: "smile", drop: "s", result: "mile", prompt: "Say 'smile'. Now drop the /s/ sound.", distractors: ["mile", "slime", "mild", "smile"].filter((x) => x !== "mile") },
  { word: "spot",  drop: "s", result: "pot",  prompt: "Say 'spot'. Now drop the /s/ sound.",  distractors: ["pot", "top", "spot", "sop"].filter((x) => x !== "pot") },
  { word: "brain", drop: "b", result: "rain", prompt: "Say 'brain'. Now drop the /b/ sound.", distractors: ["rain", "brain", "ban", "ran"].filter((x) => x !== "rain") },
  { word: "place", drop: "p", result: "lace", prompt: "Say 'place'. Now drop the /p/ sound.", distractors: ["lace", "pace", "place", "pale"].filter((x) => x !== "lace") },
];

const ROUNDS_PER_GAME = 6;

export default function PhonemeDeletingGame() {
  const { toast } = useToast();
  const patchPatient = useAuthStore((s) => s.patchPatient);

  const [rounds, setRounds] = useState<typeof ROUND_BANK>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRounds(shuffle(ROUND_BANK).slice(0, ROUNDS_PER_GAME));
  }, []);

  const round = rounds[idx];
  const options = useMemo(() => {
    if (!round) return [];
    return shuffle([round.result, ...round.distractors.slice(0, 3)]);
  }, [round]);

  function speakSound(rawSound: string) {
    if (typeof window === "undefined") return;
    // Use the phonetic stretch so TTS pronounces the sound rather than spelling.
    const spoken = SPOKEN_SOUND[rawSound.toLowerCase()] ?? rawSound;
    const u = new SpeechSynthesisUtterance(spoken);
    u.rate = 0.7;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  function pick(option: string) {
    if (picked || !round) return;
    setPicked(option);
    const isRight = option === round.result;
    if (isRight) {
      setCorrectCount((n) => n + 1);
      playApplause("soft");
    }
    // Speak the correct answer for reinforcement (the resulting word, not the original)
    setTimeout(() => {
      const u = new SpeechSynthesisUtterance(round.result);
      u.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }, 250);
    setTimeout(() => {
      const next = idx + 1;
      if (next >= rounds.length) {
        finishGame(isRight ? correctCount + 1 : correctCount);
      } else {
        setIdx(next);
        setPicked(null);
      }
    }, 1300);
  }

  async function finishGame(finalCorrect: number) {
    setFinished(true);
    setBusy(true);
    try {
      const r = await api.submitActivityScore({
        activity: "phoneme_deleting",
        correct: finalCorrect,
        total: rounds.length,
      });
      patchPatient({ xp: r.totalXp, coins: r.totalCoins, streakDays: r.streakDays });
      toast({
        title: `${r.accuracy}% — +${r.xpGained} XP, +${r.coinsGained} coins`,
        description: `${finalCorrect} of ${rounds.length} correct`,
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
            {correctCount} of {rounds.length} correct
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
          Phoneme deletion
        </h1>
        <p className="text-sm text-ink-600 dark:text-ink-400">
          Round {idx + 1} of {rounds.length} · {correctCount} correct so far
        </p>
        <div className="h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden mt-3">
          <div
            className="h-full bg-gradient-to-r from-coral-400 to-coral-600 transition-all"
            style={{ width: `${((idx + (picked ? 1 : 0)) / rounds.length) * 100}%` }}
          />
        </div>
      </div>

      <Card>
        <CardHeader
          title={round?.prompt ?? "Listen carefully"}
          subtitle="Tap to hear the sound you'll drop, then pick what's left of the word."
          action={<Badge variant="primary">Round {idx + 1}</Badge>}
        />
        <div className="flex flex-col items-center gap-4 py-3">
          {/* The word to read silently — big and centered so kids see it clearly */}
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider text-ink-500 dark:text-ink-400 mb-1">
              The word
            </p>
            <p className="font-display text-5xl text-ink-900 dark:text-ink-100">
              {round?.word}
            </p>
          </div>
          {/* Only the sound to drop is played aloud */}
          <Button onClick={() => round && speakSound(round.drop)} variant="primary" size="lg">
            <Volume2 className="w-5 h-5" />
            Hear the sound to drop
          </Button>
          <p className="text-xs text-ink-500 dark:text-ink-400 text-center">
            Drop the <span className="font-mono">/{round?.drop}/</span> sound from{" "}
            <span className="font-mono font-semibold">{round?.word}</span> — what&apos;s left?
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <AnimatePresence mode="popLayout">
          {options.map((opt, i) => {
            const isCorrect = picked && opt === round!.result;
            const isWrongPick = picked === opt && opt !== round!.result;
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
                    : "border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 hover:border-coral-400 hover:bg-coral-50 dark:hover:bg-ink-800"
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
