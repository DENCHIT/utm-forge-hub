import type { ThemeTokens } from "./types";

const VARIABLES: Record<keyof ThemeTokens, string> = {
  ink: "--ink",
  canvas: "--canvas",
  surface: "--surface",
  muted: "--muted",
  line: "--line",
  brand: "--brand",
  accent: "--accent",
  positive: "--positive",
  warning: "--warning",
  fontDisplay: "--font-display",
  fontBody: "--font-body",
  radiusCard: "--radius-card",
  logoUrl: "--logo-url",
};

/**
 * Paints an organisation's or event's brand onto the document. Colour tokens
 * are bare HSL triples ("255 92% 68%") so Tailwind's alpha modifiers still work.
 * Event tokens win over org tokens; anything unset keeps the default.
 */
export function applyTheme(...layers: (Partial<ThemeTokens> | null | undefined)[]) {
  const merged = Object.assign({}, ...layers.filter(Boolean)) as Partial<ThemeTokens>;
  const root = document.documentElement;

  for (const [token, value] of Object.entries(merged)) {
    const variable = VARIABLES[token as keyof ThemeTokens];
    if (variable && typeof value === "string" && value.trim()) {
      root.style.setProperty(variable, value.trim());
    }
  }
}

export function resetTheme() {
  const root = document.documentElement;
  for (const variable of Object.values(VARIABLES)) {
    root.style.removeProperty(variable);
  }
}
