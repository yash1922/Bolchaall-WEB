import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString();
}

export function formatRelative(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function trialDaysLeft(trialEndsAt: string | null | undefined): number {
  if (!trialEndsAt) return 0;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function isTrialExpired(trialEndsAt: string | null | undefined): boolean {
  if (!trialEndsAt) return true;
  return new Date(trialEndsAt).getTime() < Date.now();
}

export function xpToLevel(xp: number): { level: number; current: number; next: number; pct: number } {
  // Simple curve: level N requires 100 * N^1.5 cumulative XP
  let level = 1;
  let needed = 100;
  let cumulative = 0;
  while (cumulative + needed <= xp) {
    cumulative += needed;
    level += 1;
    needed = Math.floor(100 * Math.pow(level, 1.5));
  }
  const intoLevel = xp - cumulative;
  return { level, current: intoLevel, next: needed, pct: Math.min(100, (intoLevel / needed) * 100) };
}
