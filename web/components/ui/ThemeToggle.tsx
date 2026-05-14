"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
] as const;

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — only render after client mount.
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className={cn("rounded-lg bg-ink-100 dark:bg-ink-800 animate-pulse", compact ? "h-8 w-8" : "h-9 w-28")} />
    );
  }

  if (compact) {
    // Icon-only toggle: cycles light → dark → system
    const current = OPTIONS.find((o) => o.value === theme) ?? OPTIONS[2];
    const next = OPTIONS[(OPTIONS.indexOf(current) + 1) % OPTIONS.length] ?? OPTIONS[0];
    const Icon = current.icon;
    return (
      <button
        type="button"
        onClick={() => setTheme(next.value)}
        aria-label={`Theme: ${current.label}. Click to switch to ${next.label}.`}
        title={`Theme: ${current.label}`}
        className="h-9 w-9 rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 text-ink-700 dark:text-ink-200 hover:bg-brand-50 dark:hover:bg-ink-800 transition flex items-center justify-center"
      >
        <Icon className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 p-0.5"
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const selected = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(opt.value)}
            className={cn(
              "h-8 px-2.5 rounded-md text-xs font-medium transition flex items-center gap-1.5",
              selected
                ? "bg-brand-600 text-white shadow-soft"
                : "text-ink-600 dark:text-ink-300 hover:bg-brand-50 dark:hover:bg-ink-800"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
