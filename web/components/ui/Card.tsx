"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  glass = false,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { glass?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl p-6",
        glass ? "glass" : "card-base",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-4", className)}>
      <div>
        <h3 className="font-display text-xl text-ink-900 dark:text-ink-100">{title}</h3>
        {subtitle && <p className="text-sm text-ink-600 dark:text-ink-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  trend,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "flat";
}) {
  return (
    <Card className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wider text-ink-500 dark:text-ink-400 font-semibold">{label}</span>
        <span className="font-display text-3xl text-ink-900 dark:text-ink-100">{value}</span>
        {hint && <span className="text-xs text-ink-500 dark:text-ink-400">{hint}</span>}
      </div>
      {icon && (
        <div
          className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center",
            trend === "up" && "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800",
            trend === "down" && "bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-800",
            (!trend || trend === "flat") && "bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-300 ring-1 ring-brand-200 dark:ring-brand-800"
          )}
        >
          {icon}
        </div>
      )}
    </Card>
  );
}
