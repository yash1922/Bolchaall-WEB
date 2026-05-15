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
  /** What the browser's speech recognition heard (best alternative). Empty string
   *  if no speech recognized or the API isn't supported. */
  transcript: string;
  /** Speech-recognition confidence (0..1) for the top alternative. -1 if not available. */
  transcriptConfidence: number;
  /** True if `transcript` matches the `targetWord` after normalization. False if no target. */
  wordMatched: boolean;
  /** Heuristic interpretation strings, suitable for UI rendering. */
  notes: string[];
}

interface Props {
  /** Called once recording is finalized — returns final score, MFCC mean, the audio blob, and a breakdown. */
  onScored: (result: { score: number; mfccMean: number[]; blob: Blob; breakdown: ScoreBreakdown }) => void;
  /** Optional baseline MFCC vector to compare against. If omitted, scoring uses signal quality only. */
  targetMfcc?: number[];
  /** The word the user is supposed to say. Enables real word-match verification via
   *  the browser's SpeechRecognition API + folds match accuracy into the final score. */
  targetWord?: string;
  maxDurationMs?: number;
  className?: string;
  /** Change this prop value (e.g. exercise item index) to force the recorder to reset between items. */
  resetKey?: string | number;
}

// Minimal Web Speech API typing — TS doesn't ship them by default.
type SpeechRecognitionEvent = Event & {
  results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }>>;
};
type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Light Levenshtein-distance similarity (0..1) for fuzzy word matching. */
function wordSimilarity(a: string, b: string): number {
  const x = a.toLowerCase().trim();
  const y = b.toLowerCase().trim();
  if (x === y) return 1;
  if (x.length === 0 || y.length === 0) return 0;
  // Simple Levenshtein
  const m = x.length;
  const n = y.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  const distance = dp[m]![n]!;
  return Math.max(0, 1 - distance / Math.max(m, n));
}

const DEFAULT_MAX_MS = 4000;
// Frames quieter than this RMS threshold count as silence. Empirically picked
// for typical browser microphone gain — anything below this is mic noise / room tone.
const SILENCE_RMS_THRESHOLD = 0.012;

export function AudioRecorder({ onScored, targetMfcc, targetWord, maxDurationMs = DEFAULT_MAX_MS, className, resetKey }: Props) {
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
  // Web Speech API recognizer + the best transcript captured during this recording.
  // Runs in parallel with MediaRecorder so we get a real word-level transcription.
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptRef = useRef<string>("");
  const transcriptConfidenceRef = useRef<number>(-1);
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
    try {
      recognitionRef.current?.stop();
    } catch {
      /* recognition may already be ended */
    }
    recognitionRef.current = null;
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
    transcriptRef.current = "";
    transcriptConfidenceRef.current = -1;
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

    // ---- Real speech recognition (Web Speech API) ----
    // Runs in parallel with MediaRecorder. Listens to the live mic via the OS
    // speech recognizer (Google's online for Chrome, Apple's for Safari) and
    // returns the most likely word the user said.
    const SR = getSpeechRecognition();
    if (SR) {
      try {
        const recognition = new SR();
        recognition.lang = "en-US";
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 3;
        recognition.onresult = (e) => {
          // Capture the highest-confidence final transcript we've seen.
          for (let i = 0; i < e.results.length; i++) {
            const alt = e.results[i]?.[0];
            if (!alt) continue;
            // We keep the longest non-empty transcript (final results are usually
            // longer than interims; this is a tiny but reliable heuristic).
            if (alt.transcript && alt.transcript.length > transcriptRef.current.length) {
              transcriptRef.current = alt.transcript;
              transcriptConfidenceRef.current =
                typeof alt.confidence === "number" && Number.isFinite(alt.confidence)
                  ? alt.confidence
                  : -1;
            }
          }
        };
        recognition.onerror = () => {
          // Permission / network errors — leave transcript empty, MFCC scoring still works.
        };
        recognition.start();
        recognitionRef.current = recognition;
      } catch (e) {
        console.warn("[AudioRecorder] SpeechRecognition init failed:", e);
      }
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
    // Stop speech recognition first so it has a chance to fire its final onresult
    // synchronously before MediaRecorder.onstop kicks off finalizeScore.
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
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
    // Give SpeechRecognition a tiny grace period to flush its final onresult
    // before we read transcriptRef. ~250ms is enough on Chrome / Safari without
    // adding noticeable user-perceived lag.
    setTimeout(() => actuallyFinalize(), 250);
  }

  function actuallyFinalize() {
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

    // ---- Real speech recognition result ----
    const rawTranscript = transcriptRef.current.trim();
    const transcriptConfidence = transcriptConfidenceRef.current;
    let wordSim = 0;
    let wordMatched = false;
    if (targetWord && rawTranscript) {
      wordSim = wordSimilarity(rawTranscript, targetWord);
      wordMatched = wordSim >= 0.7; // Allow minor mishears (e.g. "fish" vs "fis")
    }

    const notes: string[] = [];

    // ---- Score logic ----
    let score = 0;
    if (rmsFrames.length < 5 || voicedRatio < 0.1) {
      notes.push("We couldn't quite hear you — give it another go, a bit closer to the mic.");
      score = 0;
    } else if (durationMs < 350) {
      notes.push("That was super quick — hold the word for about a second next time.");
      score = Math.max(0, Math.round(voicedRatio * 30));
    } else if (targetWord) {
      // Real word-match scoring: combines what the speech model heard with signal quality.
      // 70% transcription accuracy + 30% signal quality = honest "did you say the word AND say it clearly?"
      const wordAccuracy = wordSim * 100; // 0..100 from string similarity
      const signalScore = Math.round(
        Math.min(100, voicedRatio * 100) * 0.5 +
          Math.min(100, (mfccVariance / 40) * 100) * 0.3 +
          Math.min(100, (meanRms / 0.08) * 100) * 0.2
      );
      score = Math.round(wordAccuracy * 0.7 + signalScore * 0.3);
      if (wordMatched) {
        notes.push(`We heard "${rawTranscript}" — that matches!`);
      } else if (rawTranscript) {
        notes.push(`We heard "${rawTranscript}" — try once more, aiming for "${targetWord}".`);
      } else {
        notes.push(`We couldn't make out a word. Try saying "${targetWord}" clearly.`);
      }
    } else if (targetMfcc && targetMfcc.length === mfccMean.length && mfccMean.length > 0) {
      // MFCC reference path (no target word but a reference fingerprint)
      const sim = cosineSimilarity(targetMfcc, mfccMean);
      const accuracy = Math.max(0, Math.min(100, ((sim + 1) / 2) * 100));
      score = Math.round(accuracy * (0.4 + 0.6 * voicedRatio));
      notes.push(`Pronunciation match: ${Math.round(accuracy)}/100`);
    } else {
      // No target — composite signal-quality score (legacy path)
      const voicedScore = Math.min(100, voicedRatio * 100);
      const clarityScore = Math.min(100, (mfccVariance / 40) * 100);
      const loudnessScore = Math.min(100, (meanRms / 0.08) * 100);
      score = Math.round(voicedScore * 0.5 + clarityScore * 0.3 + loudnessScore * 0.2);
    }

    if (score > 0) {
      // Encouragement notes — always frame positively.
      if (voicedRatio < 0.4) notes.push("Try saying it as one steady sound next time.");
      else if (voicedRatio > 0.85) notes.push("Lovely steady voice — keep that going!");
      if (meanRms < 0.025) notes.push("A touch louder will help us hear you clearly.");
      else if (meanRms > 0.12) notes.push("Great clear voice!");
      if (mfccVariance < 8) notes.push("Try shaping the vowel a bit more — open your mouth.");
      else if (mfccVariance > 25) notes.push("Crisp articulation — well done!");
    }

    const breakdown: ScoreBreakdown = {
      rms: Number(meanRms.toFixed(4)),
      voicedRatio: Number(voicedRatio.toFixed(3)),
      durationMs: Math.round(durationMs),
      mfccVariance: Number(mfccVariance.toFixed(2)),
      transcript: rawTranscript,
      transcriptConfidence,
      wordMatched,
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
