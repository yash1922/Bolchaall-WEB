"use client";

import { motion } from "framer-motion";

interface Props {
  tonguePosition: "front" | "mid" | "back";
  lipShape: "rounded" | "spread" | "neutral";
  voicing: boolean;
  className?: string;
}

const TONGUE_X = { front: 100, mid: 130, back: 160 };
const LIP_OPENING = { rounded: { rx: 14, ry: 18 }, spread: { rx: 26, ry: 8 }, neutral: { rx: 20, ry: 14 } };

/**
 * Simple 2D side-view of the mouth. Tongue position and lip shape are read from
 * the phoneme metadata; the voicing dot lights up when the sound uses voice.
 */
export function MouthDiagram({ tonguePosition, lipShape, voicing, className }: Props) {
  const tongueX = TONGUE_X[tonguePosition];
  const lip = LIP_OPENING[lipShape];

  return (
    <svg
      viewBox="0 0 240 200"
      className={className}
      role="img"
      aria-label={`Mouth position diagram for ${tonguePosition} tongue, ${lipShape} lips`}
    >
      <defs>
        <linearGradient id="mouth-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1f0d35" />
          <stop offset="100%" stopColor="#3d1a5e" />
        </linearGradient>
        <radialGradient id="voice-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="240" height="200" rx="16" fill="url(#mouth-bg)" />

      {/* Head outline (very simplified side profile) */}
      <path
        d="M 30 100 Q 30 50 80 40 Q 130 35 165 50 L 195 80 L 200 110 L 175 140 Q 130 175 80 165 Q 30 155 30 110 Z"
        fill="rgba(255,255,255,0.03)"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1.5"
      />

      {/* Hard palate (roof of mouth) */}
      <path
        d="M 60 100 Q 110 80 175 95"
        fill="none"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="2"
      />

      {/* Lower jaw line */}
      <path
        d="M 60 130 Q 110 140 170 130"
        fill="none"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="2"
      />

      {/* Teeth (top + bottom) */}
      <path d="M 70 100 L 75 108 L 80 100 L 85 108 L 90 100" stroke="white" strokeWidth="1" fill="none" />
      <path d="M 70 130 L 75 122 L 80 130 L 85 122 L 90 130" stroke="white" strokeWidth="1" fill="none" />

      {/* Tongue — animated to move into position */}
      <motion.ellipse
        initial={false}
        animate={{ cx: tongueX, cy: 124 }}
        transition={{ type: "spring", stiffness: 180, damping: 20 }}
        rx="32"
        ry="14"
        fill="#f87171"
        fillOpacity="0.85"
        stroke="#fca5a5"
        strokeWidth="1.5"
      />

      {/* Lips (cross-section, on the left side) */}
      <motion.ellipse
        initial={false}
        animate={{ rx: lip.rx, ry: lip.ry }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        cx="50"
        cy="115"
        fill="none"
        stroke="#f472b6"
        strokeWidth="3"
      />

      {/* Voicing indicator (vocal folds glow) */}
      {voicing && (
        <>
          <circle cx="200" cy="125" r="22" fill="url(#voice-glow)" />
          <motion.circle
            cx="200"
            cy="125"
            r="6"
            fill="#fbbf24"
            animate={{ scale: [1, 1.15, 1], opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        </>
      )}

      {/* Labels */}
      <text x="50" y="148" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="9">
        lips
      </text>
      <text x={tongueX} y="155" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="9">
        tongue
      </text>
      {voicing && (
        <text x="200" y="160" textAnchor="middle" fill="rgba(251,191,36,0.85)" fontSize="9">
          voiced
        </text>
      )}
    </svg>
  );
}
