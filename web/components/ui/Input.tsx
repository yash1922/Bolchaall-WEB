"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-full rounded-xl bg-white border border-ink-200 px-4 py-2 text-sm text-ink-900 shadow-sm",
        "dark:bg-ink-900 dark:border-ink-700 dark:text-ink-100",
        "placeholder:text-ink-400 dark:placeholder:text-ink-500",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:border-brand-400",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition-colors",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export function Label({
  children,
  htmlFor,
  className,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-400",
        className
      )}
    >
      {children}
    </label>
  );
}

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-ink-500 dark:text-ink-400">{hint}</p>}
      {error && <p className="text-xs text-rose-500 dark:text-rose-400">{error}</p>}
    </div>
  );
}
