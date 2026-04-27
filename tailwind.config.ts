import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Project tokens (Task 2)
        brand: "hsl(var(--brand) / <alpha-value>)",
        cta: "hsl(var(--cta) / <alpha-value>)",
        page: "hsl(var(--page) / <alpha-value>)",
        ink: "hsl(var(--ink) / <alpha-value>)",
        "muted-ink": "hsl(var(--muted-ink) / <alpha-value>)",
        line: "hsl(var(--line) / <alpha-value>)",
        status: {
          plannedFg: "hsl(var(--status-planned-fg) / <alpha-value>)",
          plannedBg: "hsl(var(--status-planned-bg) / <alpha-value>)",
          progressFg: "hsl(var(--status-progress-fg) / <alpha-value>)",
          progressBg: "hsl(var(--status-progress-bg) / <alpha-value>)",
          doneFg: "hsl(var(--status-done-fg) / <alpha-value>)",
          doneBg: "hsl(var(--status-done-bg) / <alpha-value>)",
        },
        // Project tag colors (pink/violet/sky/rose) — separate namespace so
        // `bg-accent` is unambiguously the shadcn neutral accent.
        tag: {
          pink: "hsl(var(--accent-pink) / <alpha-value>)",
          violet: "hsl(var(--accent-violet) / <alpha-value>)",
          sky: "hsl(var(--accent-sky) / <alpha-value>)",
          rose: "hsl(var(--accent-rose) / <alpha-value>)",
        },
        // shadcn neutral accent (used by Toaster, hover/focus states, etc.)
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        // shadcn additions: keep our --card token; add card-foreground
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        // shadcn-only tokens
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
      },
      borderRadius: {
        card: "20px",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        elevation: "0 1px 3px rgba(0,0,0,0.05)",
        "elevation-hover": "0 4px 12px rgba(0,0,0,0.08)",
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      transitionDuration: { card: "200ms" },
    },
  },
  plugins: [animate],
};

export default config;
