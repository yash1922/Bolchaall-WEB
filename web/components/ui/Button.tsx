"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "glass" | "danger" | "outline" | "coral";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400 shadow-soft hover:shadow-lift",
  coral:
    "bg-coral-500 text-white hover:bg-coral-600 dark:bg-coral-400 dark:hover:bg-coral-500 shadow-soft hover:shadow-lift",
  ghost:
    "bg-transparent text-ink-700 hover:bg-brand-50 hover:text-brand-700 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-brand-300",
  glass:
    "bg-white/70 text-ink-800 hover:bg-white border border-ink-200 dark:bg-ink-900/70 dark:text-ink-200 dark:hover:bg-ink-800 dark:border-ink-700 shadow-soft",
  danger: "bg-rose-600 text-white hover:bg-rose-500",
  outline:
    "border-2 border-brand-300 text-brand-700 hover:bg-brand-50 bg-white dark:bg-ink-900 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-ink-800",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-base",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50 dark:focus-visible:ring-offset-ink-950",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "active:scale-[0.98]",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
