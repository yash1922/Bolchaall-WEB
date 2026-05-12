"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";
import { useEffect } from "react";

const PARTICLES = 14;

export function BadgeUnlockBurst({
  badge,
  onClose,
}: {
  badge: { name: string; description: string } | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!badge) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [badge, onClose]);

  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
        >
          {/* Confetti particles */}
          {Array.from({ length: PARTICLES }).map((_, i) => {
            const angle = (Math.PI * 2 * i) / PARTICLES;
            const distance = 140 + Math.random() * 80;
            const dx = Math.cos(angle) * distance;
            const dy = Math.sin(angle) * distance;
            const colors = ["#fbbf24", "#9461ff", "#7c3aed", "#f472b6", "#34d399"];
            const color = colors[i % colors.length];
            return (
              <motion.span
                key={i}
                initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
                animate={{ x: dx, y: dy, opacity: 0, scale: 1.2 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                style={{ background: color }}
                className="absolute w-2 h-2 rounded-full"
              />
            );
          })}

          {/* Badge popup */}
          <motion.div
            initial={{ scale: 0.4, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            className="glass-strong rounded-2xl px-6 py-5 max-w-xs text-center pointer-events-auto shadow-[0_0_60px_rgba(124,58,237,0.5)]"
          >
            <motion.div
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 0.8, repeat: 1 }}
              className="h-14 w-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center"
            >
              <Trophy className="w-7 h-7 text-ink-900" />
            </motion.div>
            <p className="text-xs uppercase tracking-[0.25em] text-gold-400 mb-1">
              Badge unlocked
            </p>
            <p className="font-display text-2xl mb-1">{badge.name}</p>
            <p className="text-xs text-ink-600">{badge.description}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
