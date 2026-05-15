/**
 * Browser-side OpenAI Whisper via @huggingface/transformers, loaded from CDN.
 *
 * We use a `webpackIgnore` dynamic import so the heavy WASM library is NEVER
 * touched by Next.js webpack — it's loaded by the browser at runtime via the
 * native ESM loader. This sidesteps the `import.meta` / `import.meta.url`
 * parser issues that break the build when bundling onnxruntime-web through
 * webpack.
 *
 * Trade-offs:
 *   - First user visit downloads transformers.js from jsDelivr (~5 MB lib +
 *     ~40 MB model on first whisper-tiny.en use). Both are cached by the
 *     browser + IndexedDB after that.
 *   - Falls back gracefully if anything fails (Web Speech API remains primary).
 */

// Type-only signature, not imported at runtime.
type TranscriptionPipeline = (
  input: string | Float32Array,
  opts?: Record<string, unknown>
) => Promise<{ text?: string }>;

let pipelinePromise: Promise<TranscriptionPipeline> | null = null;
let _isReady = false;

export function isWhisperReady(): boolean {
  return _isReady;
}

/**
 * Kick off the Whisper download + WASM init in the background.
 * Safe to call multiple times — shared promise.
 */
export function prefetchWhisper(): Promise<TranscriptionPipeline> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Whisper only runs in the browser"));
  }
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      // CDN load — `webpackIgnore: true` tells Next/webpack to leave this alone.
      // The browser's native module loader resolves it at runtime, no bundling.
      const mod = (await import(
        /* webpackIgnore: true */
        // @ts-expect-error — runtime URL import, no static type to resolve
        "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/dist/transformers.min.js"
      )) as {
        pipeline: (
          task: string,
          model: string,
          opts?: Record<string, unknown>
        ) => Promise<TranscriptionPipeline>;
      };

      const tx = await mod.pipeline(
        "automatic-speech-recognition",
        "Xenova/whisper-tiny.en",
        {
          // Try WebGPU first; transformers.js auto-falls-back to WASM if unavailable.
          device: "webgpu",
          dtype: "fp16",
        }
      );
      _isReady = true;
      return tx;
    })().catch((err) => {
      // Reset so a future call can retry.
      pipelinePromise = null;
      console.warn("[whisper] pipeline init failed:", err);
      throw err;
    });
  }
  return pipelinePromise;
}

/**
 * Transcribe an audio Blob (e.g. from MediaRecorder) using browser-side Whisper.
 * Returns the trimmed transcript, or "" on any failure.
 */
export async function whisperTranscribe(blob: Blob): Promise<string> {
  if (typeof window === "undefined") return "";
  try {
    const tx = await prefetchWhisper();
    const url = URL.createObjectURL(blob);
    try {
      const result = await tx(url, {
        chunk_length_s: 30,
        condition_on_previous_text: false,
      });
      return (result?.text ?? "").trim();
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    console.warn("[whisper] transcription failed:", err);
    return "";
  }
}
