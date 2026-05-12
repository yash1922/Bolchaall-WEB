import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm violet — primary brand
        brand: {
          50: "#f6f1ff",
          100: "#ede0ff",
          200: "#dcc4ff",
          300: "#c19aff",
          400: "#a166ff",
          500: "#7c3aed",
          600: "#6921d6",
          700: "#581ab1",
          800: "#481890",
          900: "#3b1773",
          950: "#240a4f",
        },
        // Soft warm surface tones for backgrounds & cards
        surface: {
          0: "#ffffff",
          50: "#fbf9ff",
          100: "#f5f0ff",
          200: "#ebe0fb",
          300: "#d6c2f3",
        },
        // Warm coral accent for CTAs and celebrations
        coral: {
          50: "#fff5ee",
          100: "#ffe6d4",
          200: "#ffc6a0",
          300: "#ff9d65",
          400: "#ff7a3a",
          500: "#f85a17",
          600: "#dc4108",
          700: "#b6300a",
        },
        gold: {
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },
        // Calm ink palette for text on light bg
        ink: {
          900: "#1a0d2e",
          800: "#33214f",
          700: "#4d3a6c",
          600: "#67558a",
          500: "#8675a5",
          400: "#a89cbf",
          300: "#cdc4dc",
          200: "#e3def0",
          100: "#f1eef7",
        },
        // Keep cosmic alias for backwards compatibility (some components still reference it)
        cosmic: {
          50: "#f6f1ff",
          100: "#ede0ff",
          200: "#dcc4ff",
          300: "#c19aff",
          400: "#a166ff",
          500: "#7c3aed",
          600: "#6921d6",
          700: "#581ab1",
          800: "#481890",
          900: "#3b1773",
          950: "#240a4f",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "warm-mesh":
          "radial-gradient(at 15% 5%, rgba(124,58,237,0.10) 0px, transparent 50%), radial-gradient(at 85% 0%, rgba(248,90,23,0.08) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(193,154,255,0.12) 0px, transparent 50%)",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(36, 10, 79, 0.04), 0 4px 16px rgba(36, 10, 79, 0.06)",
        lift: "0 4px 12px rgba(36, 10, 79, 0.08), 0 12px 32px rgba(124, 58, 237, 0.10)",
        glow: "0 0 0 1px rgba(124, 58, 237, 0.20), 0 8px 24px rgba(124, 58, 237, 0.18)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        shimmer: "shimmer 2s linear infinite",
        "bounce-soft": "bounceSoft 0.6s ease-in-out",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        bounceSoft: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
