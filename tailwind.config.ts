import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "hsl(var(--brand) / <alpha-value>)",
        cta: "hsl(var(--cta) / <alpha-value>)",
        page: "hsl(var(--page) / <alpha-value>)",
        card: "hsl(var(--card) / <alpha-value>)",
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
        accent: {
          pink: "hsl(var(--accent-pink) / <alpha-value>)",
          violet: "hsl(var(--accent-violet) / <alpha-value>)",
          sky: "hsl(var(--accent-sky) / <alpha-value>)",
          rose: "hsl(var(--accent-rose) / <alpha-value>)",
        },
      },
      borderRadius: { card: "20px" },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.05)",
        hover: "0 4px 12px rgba(0,0,0,0.08)",
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      transitionDuration: { card: "200ms" },
    },
  },
  plugins: [],
};

export default config;
