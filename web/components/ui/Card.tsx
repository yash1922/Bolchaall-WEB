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
        <h3 className="font-display text-xl text-ink-900">{title}</h3>
        {subtitle && <p className="text-sm text-ink-600 mt-0.5">{subtitle}</p>}
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
        <span className="text-xs uppercase tracking-wider text-ink-500 font-semibold">{label}</span>
        <span className="font-display text-3xl text-ink-900">{value}</span>
        {hint && <span className="text-xs text-ink-500">{hint}</span>}
      </div>
      {icon && (
        <div
          className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center",
            trend === "up" && "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200",
            trend === "down" && "bg-rose-50 text-rose-600 ring-1 ring-rose-200",
            (!trend || trend === "flat") && "bg-brand-50 text-brand-600 ring-1 ring-brand-200"
          )}
        >
          {icon}
        </div>
      )}
    </Card>
  );
}
