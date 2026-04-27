import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#0D9488", dark: "#14B8A6" },
        cta: { DEFAULT: "#F97316", dark: "#FB923C" },
        page: { DEFAULT: "#F5F5F7", dark: "#0A0A0A" },
        card: { DEFAULT: "#FFFFFF", dark: "#171717" },
        ink: { DEFAULT: "#0F172A", dark: "#F1F5F9" },
        muted: { DEFAULT: "#475569", dark: "#94A3B8" },
        line: { DEFAULT: "#E2E8F0", dark: "#262626" },
        status: {
          plannedFg: "#64748B", plannedBg: "#F1F5F9",
          progressFg: "#F59E0B", progressBg: "#FEF3C7",
          doneFg: "#10B981", doneBg: "#D1FAE5",
        },
        accent: {
          pink: "#EC4899", violet: "#8B5CF6",
          sky: "#0EA5E9", rose: "#F43F5E",
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
