// Web Audio API synthesized sound effects — no asset files required.

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  return audioCtx;
}

/**
 * Synthesize an applause sound: a sequence of short noise bursts through a
 * bandpass filter, with timing jitter to feel like multiple hands clapping.
 */
export function playApplause(intensity: "soft" | "loud" = "loud"): void {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const claps = intensity === "loud" ? 14 : 7;
  const duration = intensity === "loud" ? 1.4 : 0.8;
  const baseGain = intensity === "loud" ? 0.5 : 0.3;
  const masterGain = ctx.createGain();
  masterGain.gain.value = 1;
  masterGain.connect(ctx.destination);

  for (let i = 0; i < claps; i++) {
    const t = ctx.currentTime + (i / claps) * duration + (Math.random() - 0.5) * 0.05;
    const buf = ctx.createBuffer(1, Math.max(64, Math.floor(ctx.sampleRate * 0.04)), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let j = 0; j < data.length; j++) {
      data[j] = (Math.random() * 2 - 1) * Math.exp(-j / 180);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1200 + Math.random() * 1200;
    filter.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(baseGain * (0.7 + Math.random() * 0.3), t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    src.connect(filter).connect(g).connect(masterGain);
    src.start(t);
    src.stop(t + 0.2);
  }
}

/** Short cheerful chime for badge unlock — three quick rising notes. */
export function playChime(): void {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  const start = ctx.currentTime;
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    const t = start + i * 0.12;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.5);
  });
}

/** Soft tick on each phoneme boundary while the character speaks. */
export function playTick(): void {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 440;
  const g = ctx.createGain();
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.04, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.06);
}
