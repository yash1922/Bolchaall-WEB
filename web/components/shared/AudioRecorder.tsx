"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/** Detailed sub-metrics extracted from the recording — surfaced so users see what
 *  drove their score. */
export interface ScoreBreakdown {
  /** Mean RMS (loudness, ~0..0.6). Higher = louder voice. */
  rms: number;
  /** Fraction of frames where RMS exceeded the silence threshold (0..1). */
  voicedRatio: number;
  /** Total recorded duration in ms. */
  durationMs: number;
  /** Std-dev of MFCC frames — proxy for spectral richness / clarity. */
  mfccVariance: number;
  /** Heuristic interpretation strings, suitable for UI rendering. */
  notes: string[];
}

interface Props {
  /** Called once recording is finalized — returns final score, MFCC mean, the audio blob, and a breakdown. */
  onScored: (result: { score: number; mfccMean: number[]; blob: Blob; breakdown: ScoreBreakdown }) => void;
  /** Optional baseline MFCC vector to compare against. If omitted, scoring uses signal quality only. */
  targetMfcc?: number[];
  maxDurationMs?: number;
  className?: string;
  /** Change this prop value (e.g. exercise item index) to force the recorder to reset between items. */
  resetKey?: string | number;
}

const DEFAULT_MAX_MS = 4000;
// Frames quieter than this RMS threshold count as silence. Empirically picked
// for typical browser microphone gain — anything below this is mic noise / room tone.
const SILENCE_RMS_THRESHOLD = 0.012;

export function AudioRecorder({ onScored, targetMfcc, maxDurationMs = DEFAULT_MAX_MS, className, resetKey }: Props) {
  const [state, setState] = useState<"idle" | "recording" | "scoring" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [lastBlobUrl, setLastBlobUrl] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const meydaAnalyzerRef = useRef<{ stop: () => void } | null>(null);
  const mfccFramesRef = useRef<number[][]>([]);
  const rmsFramesRef = useRef<number[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      cleanup();
      if (lastBlobUrl) URL.revokeObjectURL(lastBlobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the parent advances to a new item, drop the previous recording and reset to idle.
  useEffect(() => {
    cleanup();
    chunksRef.current = [];
    mfccFramesRef.current = [];
    rmsFramesRef.current = [];
    setElapsedMs(0);
    setError(null);
    setState("idle");
    setLastBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  function cleanup() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    rafRef.current = null;
    stopTimerRef.current = null;
    meydaAnalyzerRef.current?.stop();
    meydaAnalyzerRef.current = null;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
  }

  async function start() {
    setError(null);
    setElapsedMs(0);
    chunksRef.current = [];
    mfccFramesRef.current = [];
    rmsFramesRef.current = [];
    if (lastBlobUrl) {
      URL.revokeObjectURL(lastBlobUrl);
      setLastBlobUrl(null);
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone permission denied or unavailable.");
      setState("error");
      return;
    }
    streamRef.current = stream;

    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    analyserRef.current = analyser;
    source.connect(analyser);

    // MFCC via meyda — dynamic import keeps initial bundle smaller.
    try {
      const Meyda = (await import("meyda")).default as unknown as {
        createMeydaAnalyzer: (opts: {
          audioContext: AudioContext;
          source: MediaStreamAudioSourceNode;
          bufferSize: number;
          featureExtractors: string[];
          callback: (features: { mfcc?: number[]; rms?: number }) => void;
        }) => { start: () => void; stop: () => void };
      };
      const analyzer = Meyda.createMeydaAnalyzer({
        audioContext: audioCtx,
        source,
        bufferSize: 512,
        featureExtractors: ["mfcc", "rms"],
        callback: (features) => {
          if (features.mfcc && features.mfcc.length === 13) {
            mfccFramesRef.current.push(features.mfcc);
          }
          if (typeof features.rms === "number" && Number.isFinite(features.rms)) {
            rmsFramesRef.current.push(features.rms);
          }
        },
      });
      analyzer.start();
      meydaAnalyzerRef.current = analyzer;
    } catch (e) {
      console.warn("Meyda init failed; will fall back to signal-quality scoring.", e);
    }

    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => finalizeScore();
    recorder.start();
    recorderRef.current = recorder;

    startedAtRef.current = performance.now();
    setState("recording");
    drawWave();
    stopTimerRef.current = window.setTimeout(stop, maxDurationMs);
  }

  function stop() {
    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      setState("scoring");
      recorderRef.current.stop();
    }
  }

  function reset() {
    cleanup();
    chunksRef.current = [];
    mfccFramesRef.current = [];
    rmsFramesRef.current = [];
    setElapsedMs(0);
    setState("idle");
    if (lastBlobUrl) {
      URL.revokeObjectURL(lastBlobUrl);
      setLastBlobUrl(null);
    }
  }

  function finalizeScore() {
    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type ?? "audio/webm" });
    setLastBlobUrl(URL.createObjectURL(blob));

    const mfccMean = computeMean(mfccFramesRef.current);
    const rmsFrames = rmsFramesRef.current;
    const mfccFrames = mfccFramesRef.current;

    // ---- Honest sub-metric extraction ----
    const durationMs = performance.now() - startedAtRef.current;
    const meanRms =
      rmsFrames.length > 0
        ? rmsFrames.reduce((a, b) => a + b, 0) / rmsFrames.length
        : 0;
    const voicedFrames = rmsFrames.filter((r) => r > SILENCE_RMS_THRESHOLD).length;
    const voicedRatio = rmsFrames.length > 0 ? voicedFrames / rmsFrames.length : 0;
    const mfccVariance = computeMfccVariance(mfccFrames);
    const notes: string[] = [];

    // ---- Score logic ----
    // 1. If basically silent → score 0, surface why.
    let score = 0;
    if (rmsFrames.length < 5 || voicedRatio < 0.1) {
      notes.push("We didn't pick up any speech — try again, a bit louder.");
      score = 0;
    } else if (durationMs < 350) {
      notes.push("Recording too short — hold the word for at least half a second.");
      score = Math.max(0, Math.round(voicedRatio * 30));
    } else {
      // 2. We have real speech. Use MFCC similarity if we have a target, else
      //    composite of voice activity + clarity + loudness.
      if (targetMfcc && targetMfcc.length === mfccMean.length && mfccMean.length > 0) {
        const sim = cosineSimilarity(targetMfcc, mfccMean);
        // Map cosine [-1,1] → [0,100]
        const accuracy = Math.max(0, Math.min(100, ((sim + 1) / 2) * 100));
        // Penalize quiet / mostly-silent attempts even if MFCC matches noise
        score = Math.round(accuracy * (0.4 + 0.6 * voicedRatio));
        notes.push(`Pronunciation match: ${Math.round(accuracy)}/100`);
      } else {
        // No reference — composite quality score
        const voicedScore = Math.min(100, voicedRatio * 100);              // 0..100
        const clarityScore = Math.min(100, (mfccVariance / 40) * 100);     // 0..100
        const loudnessScore = Math.min(100, (meanRms / 0.08) * 100);       // 0..100
        score = Math.round(voicedScore * 0.5 + clarityScore * 0.3 + loudnessScore * 0.2);
      }

      // Encouragement notes for the breakdown card
      if (voicedRatio < 0.4) notes.push("Lots of pauses — try one steady utterance.");
      else if (voicedRatio > 0.85) notes.push("Strong, sustained voicing.");
      if (meanRms < 0.025) notes.push("A bit quiet — speak a touch louder next time.");
      else if (meanRms > 0.12) notes.push("Great projection.");
      if (mfccVariance < 8) notes.push("Tone was monotone — exaggerate the vowel.");
      else if (mfccVariance > 25) notes.push("Rich spectral variation — clear articulation.");
    }

    const breakdown: ScoreBreakdown = {
      rms: Number(meanRms.toFixed(4)),
      voicedRatio: Number(voicedRatio.toFixed(3)),
      durationMs: Math.round(durationMs),
      mfccVariance: Number(mfccVariance.toFixed(2)),
      notes,
    };

    cleanup();
    setState("done");
    onScored({ score, mfccMean, blob, breakdown });
  }

  function drawWave() {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const buffer = new Uint8Array(analyser.fftSize);
    const tick = () => {
      if (state === "scoring" || state === "done" || state === "idle") return;
      analyser.getByteTimeDomainData(buffer);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "#9461ff");
      grad.addColorStop(1, "#7c3aed");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const slice = w / buffer.length;
      let x = 0;
      for (let i = 0; i < buffer.length; i++) {
        const v = (buffer[i] ?? 128) / 128;
        const y = (v * h) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += slice;
      }
      ctx.stroke();
      setElapsedMs(performance.now() - startedAtRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  return (
    <div className={cn("rounded-2xl glass p-5 flex flex-col gap-4", className)}>
      <canvas
        ref={canvasRef}
        width={600}
        height={120}
        className="w-full h-24 rounded-lg bg-surface-50/60 border border-ink-200"
      />

      <div className="flex items-center justify-between text-xs text-ink-600">
        <span>
          {state === "recording" && (
            <span className="inline-flex items-center gap-1.5 text-rose-600">
              <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
              Recording — {(elapsedMs / 1000).toFixed(1)}s
            </span>
          )}
          {state === "scoring" && "Scoring…"}
          {state === "done" && "Recording captured. Press reset to try again."}
          {state === "idle" && `Up to ${maxDurationMs / 1000}s of speech.`}
          {state === "error" && <span className="text-rose-600">{error}</span>}
        </span>
        <span className="font-mono">{state}</span>
      </div>

      <div className="flex items-center justify-center gap-2">
        {state === "idle" || state === "error" ? (
          <Button onClick={start} size="lg">
            <Mic className="w-4 h-4" />
            Start recording
          </Button>
        ) : null}
        {state === "recording" && (
          <Button onClick={stop} variant="danger" size="lg">
            <Square className="w-4 h-4" />
            Stop
          </Button>
        )}
        {state === "done" && (
          <>
            {lastBlobUrl && (
              <Button
                variant="glass"
                onClick={() => {
                  const a = new Audio(lastBlobUrl);
                  a.play().catch(() => {});
                }}
              >
                <Play className="w-4 h-4" />
                Play back
              </Button>
            )}
            <Button variant="ghost" onClick={reset}>
              <RotateCcw className="w-4 h-4" />
              Try again
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function computeMean(frames: number[][]): number[] {
  if (frames.length === 0) return [];
  const len = frames[0]?.length ?? 13;
  const sum = new Array<number>(len).fill(0);
  for (const f of frames) {
    for (let i = 0; i < len; i++) sum[i]! += f[i] ?? 0;
  }
  return sum.map((v) => v / frames.length);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) return 0;
  return dot / denom;
}

/** Std-dev of all MFCC coefficients across frames. Higher = more spectral movement. */
function computeMfccVariance(frames: number[][]): number {
  if (frames.length < 2) return 0;
  const flat = frames.flat();
  if (flat.length === 0) return 0;
  const mean = flat.reduce((s, v) => s + v, 0) / flat.length;
  const variance = flat.reduce((s, v) => s + (v - mean) ** 2, 0) / flat.length;
  return Math.sqrt(variance);
}
