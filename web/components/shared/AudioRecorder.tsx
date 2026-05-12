"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface Props {
  /** Called once recording is finalized — returns score (0–100), MFCC mean vector, and the audio blob. */
  onScored: (result: { score: number; mfccMean: number[]; blob: Blob }) => void;
  /** Optional baseline MFCC vector to compare against. If omitted, scoring uses signal quality only. */
  targetMfcc?: number[];
  maxDurationMs?: number;
  className?: string;
}

const DEFAULT_MAX_MS = 4000;

export function AudioRecorder({ onScored, targetMfcc, maxDurationMs = DEFAULT_MAX_MS, className }: Props) {
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
          callback: (features: { mfcc?: number[] }) => void;
        }) => { start: () => void; stop: () => void };
      };
      const analyzer = Meyda.createMeydaAnalyzer({
        audioContext: audioCtx,
        source,
        bufferSize: 512,
        featureExtractors: ["mfcc"],
        callback: (features) => {
          if (features.mfcc && features.mfcc.length === 13) {
            mfccFramesRef.current.push(features.mfcc);
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

    let score: number;
    if (targetMfcc && targetMfcc.length === mfccMean.length && mfccMean.length > 0) {
      const sim = cosineSimilarity(targetMfcc, mfccMean);
      // Map cosine [-1,1] → [0,100], floor at 30 so users always see encouraging numbers.
      score = Math.round(Math.max(30, Math.min(100, ((sim + 1) / 2) * 100)));
    } else {
      score = signalQualityScore(mfccFramesRef.current);
    }

    cleanup();
    setState("done");
    onScored({ score, mfccMean, blob });
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

function signalQualityScore(frames: number[][]): number {
  // Heuristic: well-articulated speech has substantial frame count + spectral spread.
  if (frames.length < 5) return 50;
  const flatFrames = frames.flat();
  const mean = flatFrames.reduce((s, v) => s + v, 0) / flatFrames.length;
  const variance =
    flatFrames.reduce((s, v) => s + (v - mean) ** 2, 0) / flatFrames.length;
  const stdev = Math.sqrt(variance);
  // Map ~0..40 stdev to 60..95
  const mapped = 60 + Math.min(35, Math.max(0, (stdev / 40) * 35));
  return Math.round(mapped);
}
