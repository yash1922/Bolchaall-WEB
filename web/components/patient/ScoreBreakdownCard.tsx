"use client";

import { motion } from "framer-motion";
import { Activity, CheckCircle2, MessageSquare, Mic, Sparkles, Star, Volume2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScoreBreakdown } from "@/components/shared/AudioRecorder";

/**
 * Renders a transparent breakdown of how the score was computed —
 * loudness, voiced ratio, duration, clarity — plus heuristic notes.
 *
 * Designed to defuse the "I didn't say anything but it gave me a score"
 * complaint by making the underlying signal-quality measurements visible.
 */
export function ScoreBreakdownCard({
  score,
  breakdown,
  caption,
}: {
  score: number;
  breakdown: ScoreBreakdown;
  caption?: string;
}) {
  // Map raw sub-metrics into 0..100 visual bars
  const loudnessPct = Math.min(100, Math.round((breakdown.rms / 0.12) * 100));
  const voicedPct = Math.min(100, Math.round(breakdown.voicedRatio * 100));
  const clarityPct = Math.min(100, Math.round((breakdown.mfccVariance / 40) * 100));
  const durationSec = (breakdown.durationMs / 1000).toFixed(1);
  // Encouraging, never harsh. Low scores frame the next try as a small adjustment,
  // not a failure — kids especially need this on hard articulation drills.
  const verdict =
    score === 0
      ? "Let's give it another try"
      : score >= 80
      ? "Beautifully done"
      : score >= 60
      ? "Nice work — keep going"
      : score >= 30
      ? "Good start — try once more"
      : "Almost there — a little louder next time";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 p-4"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center font-display text-lg text-white",
              score === 0
                ? "bg-ink-400 dark:bg-ink-600"
                : score >= 80
                ? "bg-emerald-500"
                : score >= 60
                ? "bg-brand-500"
                : "bg-coral-500"
            )}
          >
            {score}
          </div>
          <div>
            <p className="font-semibold text-ink-900 dark:text-ink-100">{verdict}</p>
            <p className="text-xs text-ink-600 dark:text-ink-400">
              {caption ?? "Here's what we measured from your recording."}
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-gold-500 shrink-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                "w-4 h-4",
                i < Math.round(score / 20) ? "fill-gold-500" : "text-ink-300 dark:text-ink-700"
              )}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
        <Bar
          icon={<Volume2 className="w-3.5 h-3.5" />}
          label="Loudness"
          pct={loudnessPct}
          raw={`${(breakdown.rms * 1000).toFixed(0)} (RMS × 1000)`}
          color="brand"
        />
        <Bar
          icon={<Mic className="w-3.5 h-3.5" />}
          label="Speech detected"
          pct={voicedPct}
          raw={`${voicedPct}% of frames had voice`}
          color="emerald"
        />
        <Bar
          icon={<Activity className="w-3.5 h-3.5" />}
          label="Clarity"
          pct={clarityPct}
          raw={`MFCC variance ${breakdown.mfccVariance.toFixed(1)}`}
          color="coral"
        />
        <Bar
          icon={<Sparkles className="w-3.5 h-3.5" />}
          label="Duration"
          pct={Math.min(100, Math.round((breakdown.durationMs / 3000) * 100))}
          raw={`${durationSec}s captured`}
          color="gold"
        />
      </div>

      {/* Two-model speech recognition output — shows both Web Speech API and Whisper.
          Highlights whichever model "won" (best match to the target). */}
      {(breakdown.transcript || breakdown.whisperTranscript) && (
        <div className="mb-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-ink-500 dark:text-ink-400 font-semibold">
              Speech recognition (2 models)
            </p>
            {breakdown.wordMatched ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Match
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-coral-700 dark:text-coral-300 font-semibold">
                <XCircle className="w-3.5 h-3.5" />
                Try again
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <TranscriptRow
              label="Web Speech API"
              source="Google / Apple cloud ASR"
              text={breakdown.transcript}
              confidence={breakdown.transcriptConfidence}
              isBest={breakdown.bestTranscriptSource === "webspeech"}
            />
            <TranscriptRow
              label="Whisper (Xenova/whisper-tiny.en)"
              source="OpenAI · in-browser WASM"
              text={breakdown.whisperTranscript}
              confidence={-1}
              isBest={breakdown.bestTranscriptSource === "whisper"}
            />
          </div>
        </div>
      )}

      {breakdown.notes.length > 0 && (
        <ul className="space-y-1 text-xs text-ink-700 dark:text-ink-300 border-t border-ink-200 dark:border-ink-700 pt-3">
          {breakdown.notes.map((n, i) => (
            <li key={i} className="flex gap-1.5">
              <span className="text-brand-500 dark:text-brand-400">•</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

function Bar({
  icon,
  label,
  pct,
  raw,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  pct: number;
  raw: string;
  color: "brand" | "emerald" | "coral" | "gold";
}) {
  const fill =
    color === "brand"
      ? "bg-gradient-to-r from-brand-400 to-brand-600"
      : color === "emerald"
      ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
      : color === "coral"
      ? "bg-gradient-to-r from-coral-400 to-coral-600"
      : "bg-gradient-to-r from-gold-400 to-gold-600";
  const iconColor =
    color === "brand"
      ? "text-brand-600 dark:text-brand-400"
      : color === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : color === "coral"
      ? "text-coral-600 dark:text-coral-400"
      : "text-gold-600 dark:text-gold-400";
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className={cn("inline-flex items-center gap-1 font-medium", iconColor)}>
          {icon}
          {label}
        </span>
        <span className="text-ink-500 dark:text-ink-400 font-mono">{pct}%</span>
      </div>
      <div
        className="h-1.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden"
        title={raw}
      >
        <div className={cn("h-full transition-all", fill)} style={{ width: `${pct}%` }} />
      </div>
      <span className="block text-[10px] text-ink-500 dark:text-ink-500 mt-0.5">{raw}</span>
    </div>
  );
}

function TranscriptRow({
  label,
  source,
  text,
  confidence,
  isBest,
}: {
  label: string;
  source: string;
  text: string;
  confidence: number;
  isBest: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 transition",
        isBest
          ? "border-brand-400 dark:border-brand-600 bg-brand-50 dark:bg-brand-950"
          : "border-ink-200 dark:border-ink-700 bg-ink-50 dark:bg-ink-800/40"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wider text-ink-500 dark:text-ink-400 font-semibold truncate">
          {label}
        </p>
        {isBest && (
          <span className="text-[9px] uppercase tracking-wider text-brand-700 dark:text-brand-300 font-bold shrink-0">
            best
          </span>
        )}
      </div>
      <p className="text-sm text-ink-900 dark:text-ink-100 font-medium truncate mt-0.5">
        {text ? `"${text}"` : <span className="text-ink-500 italic">no result</span>}
        {confidence >= 0 && text && (
          <span className="ml-1.5 text-[10px] font-mono text-ink-500 dark:text-ink-400">
            {(confidence * 100).toFixed(0)}%
          </span>
        )}
      </p>
      <p className="text-[9px] text-ink-500 dark:text-ink-500 mt-0.5 truncate">{source}</p>
    </div>
  );
}
