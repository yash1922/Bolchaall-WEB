"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  word: string;
  /** Auto-speak once when word changes */
  autoPlay?: boolean;
  /** Tongue position from phoneme metadata (optional — affects mouth shape) */
  variant?: "neutral" | "wide" | "round";
  className?: string;
  size?: number;
  label?: string;
}

/**
 * Friendly 2D character that animates a mouth while reading the word out loud.
 * Uses the browser's SpeechSynthesis API and synthetic mouth bounce timing
 * (real boundary events are not consistently reported across browsers).
 */
export function SpeakingCharacter({
  word,
  autoPlay = false,
  variant = "neutral",
  className,
  size = 180,
  label,
}: Props) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [mouthScale, setMouthScale] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playedRef = useRef<string | null>(null);

  function speak() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(word);
    u.rate = 0.78;
    u.pitch = 1.05;
    u.volume = 1;
    u.onstart = () => {
      setIsSpeaking(true);
      // Animate mouth scale at ~6 Hz while speaking
      intervalRef.current = setInterval(() => {
        setMouthScale(0.6 + Math.random() * 0.8);
      }, 130);
    };
    u.onend = () => {
      setIsSpeaking(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setMouthScale(1);
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  useEffect(() => {
    if (!autoPlay) return;
    if (playedRef.current === word) return;
    playedRef.current = word;
    const t = setTimeout(speak, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word, autoPlay]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Mouth dimensions
  const mouthWidth = variant === "wide" ? 56 : variant === "round" ? 30 : 44;
  const mouthRx = variant === "round" ? 18 : variant === "wide" ? 28 : 22;
  const mouthRyBase = variant === "round" ? 18 : variant === "wide" ? 8 : 12;

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <button
        type="button"
        onClick={speak}
        aria-label={`Hear the word ${word}`}
        className="group relative"
        style={{ width: size, height: size }}
      >
        <motion.svg
          viewBox="0 0 200 200"
          width={size}
          height={size}
          animate={isSpeaking ? { y: [-2, 2, -2] } : { y: 0 }}
          transition={{ duration: 0.4, repeat: isSpeaking ? Infinity : 0, ease: "easeInOut" }}
        >
          <defs>
            <radialGradient id="char-face" cx="0.5" cy="0.4" r="0.7">
              <stop offset="0%" stopColor="#ffe4cc" />
              <stop offset="100%" stopColor="#ffb88a" />
            </radialGradient>
            <linearGradient id="char-bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f5f0ff" />
              <stop offset="100%" stopColor="#dcc4ff" />
            </linearGradient>
            <radialGradient id="cheek-blush" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#ff7a9c" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#ff7a9c" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background bubble */}
          <circle cx="100" cy="100" r="92" fill="url(#char-bg)" />
          <circle cx="100" cy="100" r="92" fill="none" stroke="#dcc4ff" strokeWidth="2" />

          {/* Sound waves while speaking */}
          {isSpeaking && (
            <>
              <motion.circle
                cx="100"
                cy="100"
                r="60"
                fill="none"
                stroke="#7c3aed"
                strokeWidth="1.5"
                strokeOpacity="0.4"
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 1.2, repeat: Infinity }}
                style={{ transformOrigin: "100px 100px" }}
              />
              <motion.circle
                cx="100"
                cy="100"
                r="60"
                fill="none"
                stroke="#f85a17"
                strokeWidth="1.5"
                strokeOpacity="0.3"
                initial={{ scale: 1, opacity: 0.4 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.6 }}
                style={{ transformOrigin: "100px 100px" }}
              />
            </>
          )}

          {/* Face circle */}
          <circle cx="100" cy="105" r="58" fill="url(#char-face)" stroke="#d99a6c" strokeWidth="1.5" />

          {/* Hair tuft on top */}
          <path
            d="M 75 55 Q 85 30 100 50 Q 115 30 125 55 Q 115 60 100 55 Q 85 60 75 55 Z"
            fill="#4d3a6c"
          />

          {/* Cheek blush */}
          <circle cx="72" cy="118" r="10" fill="url(#cheek-blush)" />
          <circle cx="128" cy="118" r="10" fill="url(#cheek-blush)" />

          {/* Eyes */}
          <motion.g
            animate={isSpeaking ? { scaleY: 1 } : { scaleY: [1, 1, 0.1, 1] }}
            transition={{ duration: 4, repeat: Infinity, times: [0, 0.95, 0.97, 1] }}
            style={{ transformOrigin: "100px 95px" }}
          >
            <ellipse cx="80" cy="95" rx="6" ry="8" fill="#1a0d2e" />
            <ellipse cx="120" cy="95" rx="6" ry="8" fill="#1a0d2e" />
            <circle cx="82" cy="93" r="2" fill="white" />
            <circle cx="122" cy="93" r="2" fill="white" />
          </motion.g>

          {/* Eyebrows — raise slightly when speaking */}
          <motion.g
            animate={isSpeaking ? { y: -3 } : { y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <path d="M 70 80 Q 80 75 90 80" stroke="#4d3a6c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M 110 80 Q 120 75 130 80" stroke="#4d3a6c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </motion.g>

          {/* Mouth — animates with speech */}
          <motion.ellipse
            cx="100"
            cy="135"
            rx={mouthRx}
            initial={false}
            animate={{ ry: mouthRyBase * mouthScale }}
            transition={{ duration: 0.1 }}
            fill="#5a1f3d"
            stroke="#8c2a5b"
            strokeWidth="1.5"
          />
          {/* Tongue glimpse when mouth is wide */}
          {mouthScale > 1.0 && (
            <ellipse
              cx="100"
              cy={138 + mouthRyBase * mouthScale * 0.2}
              rx={mouthRx * 0.6}
              ry={mouthRyBase * mouthScale * 0.5}
              fill="#ff7a9c"
            />
          )}

          {/* Speaker icon hint when idle */}
          {!isSpeaking && (
            <g transform="translate(155, 25)" opacity="0.7">
              <circle cx="10" cy="10" r="14" fill="#7c3aed" />
              <path
                d="M 6 10 L 10 7 L 10 13 Z M 12 7 Q 14 10 12 13"
                stroke="white"
                strokeWidth="1.5"
                fill="white"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>
          )}
        </motion.svg>
        <span className="absolute inset-0 rounded-full ring-0 ring-brand-300 group-hover:ring-4 transition" />
        {void mouthWidth}
      </button>
      <div className="text-center">
        {label && <p className="text-xs uppercase tracking-wider text-ink-500 font-semibold mb-1">{label}</p>}
        <p className="font-display text-3xl text-ink-900">{word}</p>
        <button
          onClick={speak}
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-brand-700 hover:text-brand-800 font-medium"
        >
          <Volume2 className="w-3.5 h-3.5" />
          Hear it again
        </button>
      </div>
    </div>
  );
}
