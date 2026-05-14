"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

/**
 * Wraps next-themes' ThemeProvider with our defaults:
 *  - `attribute="class"` so Tailwind's `dark:` variant picks it up
 *  - `defaultTheme="system"` respects OS preference on first visit
 *  - `enableSystem` allows users to follow OS or pick light/dark explicitly
 *  - `disableTransitionOnChange` prevents the brief flash when toggling
 *
 * next-themes injects an inline `<script>` into <head> that sets the class
 * BEFORE the page renders, so there's no light→dark flicker on cold loads.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="bolchall-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
