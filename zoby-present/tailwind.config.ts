import type { Config } from "tailwindcss";

// Every colour is a CSS variable so an org's brand can be swapped at runtime
// (see applyTheme in src/lib/theme.ts) without a rebuild.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "hsl(var(--ink) / <alpha-value>)",
        canvas: "hsl(var(--canvas) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        line: "hsl(var(--line) / <alpha-value>)",
        brand: "hsl(var(--brand) / <alpha-value>)",
        accent: "hsl(var(--accent) / <alpha-value>)",
        positive: "hsl(var(--positive) / <alpha-value>)",
        warning: "hsl(var(--warning) / <alpha-value>)",
      },
      fontFamily: {
        display: "var(--font-display)",
        sans: "var(--font-body)",
      },
      borderRadius: {
        card: "var(--radius-card)",
      },
      keyframes: {
        "rise-in": {
          from: { opacity: "0", transform: "translateY(18px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "rise-in": "rise-in 520ms cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 2.4s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
