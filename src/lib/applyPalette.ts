// Applies a saved palette on app boot so user choice persists across pages/reloads.
type P = {
  primary: string; primaryFg: string;
  accent: string; accentFg: string;
  ring: string;
  secondary: string; secondaryFg: string;
  sidebarAccent: string; sidebarAccentFg: string;
};

const PALETTES: Record<string, P> = {
  "bordeaux-or": {
    primary: "345 65% 28%", primaryFg: "0 0% 100%",
    accent: "50 95% 60%", accentFg: "345 65% 28%",
    ring: "345 65% 28%",
    secondary: "45 60% 94%", secondaryFg: "345 65% 28%",
    sidebarAccent: "50 95% 90%", sidebarAccentFg: "345 65% 28%",
  },
  "bleu-royal": {
    primary: "220 70% 28%", primaryFg: "0 0% 100%",
    accent: "210 30% 80%", accentFg: "220 70% 18%",
    ring: "220 70% 28%",
    secondary: "215 40% 95%", secondaryFg: "220 70% 28%",
    sidebarAccent: "215 50% 92%", sidebarAccentFg: "220 70% 28%",
  },
  "vert-emeraude": {
    primary: "158 65% 25%", primaryFg: "0 0% 100%",
    accent: "42 85% 55%", accentFg: "158 65% 18%",
    ring: "158 65% 25%",
    secondary: "150 30% 94%", secondaryFg: "158 65% 25%",
    sidebarAccent: "150 40% 90%", sidebarAccentFg: "158 65% 25%",
  },
  "violet-episcopal": {
    primary: "275 45% 32%", primaryFg: "0 0% 100%",
    accent: "40 60% 82%", accentFg: "275 45% 22%",
    ring: "275 45% 32%",
    secondary: "280 25% 94%", secondaryFg: "275 45% 32%",
    sidebarAccent: "280 35% 92%", sidebarAccentFg: "275 45% 32%",
  },
  "noir-or": {
    primary: "0 0% 10%", primaryFg: "45 80% 70%",
    accent: "42 80% 52%", accentFg: "0 0% 10%",
    ring: "0 0% 10%",
    secondary: "0 0% 96%", secondaryFg: "0 0% 10%",
    sidebarAccent: "45 60% 90%", sidebarAccentFg: "0 0% 10%",
  },
  "indigo-ciel": {
    primary: "238 65% 38%", primaryFg: "0 0% 100%",
    accent: "200 90% 65%", accentFg: "238 65% 18%",
    ring: "238 65% 38%",
    secondary: "220 40% 96%", secondaryFg: "238 65% 38%",
    sidebarAccent: "210 80% 92%", sidebarAccentFg: "238 65% 38%",
  },
};

export function applySavedPalette() {
  try {
    const key = localStorage.getItem("gsp.palette") ?? "bordeaux-or";
    const p = PALETTES[key];
    if (!p) return;
    const r = document.documentElement;
    r.style.setProperty("--primary", p.primary);
    r.style.setProperty("--primary-foreground", p.primaryFg);
    r.style.setProperty("--accent", p.accent);
    r.style.setProperty("--accent-foreground", p.accentFg);
    r.style.setProperty("--ring", p.ring);
    r.style.setProperty("--secondary", p.secondary);
    r.style.setProperty("--secondary-foreground", p.secondaryFg);
    r.style.setProperty("--sidebar-primary", p.primary);
    r.style.setProperty("--sidebar-primary-foreground", p.primaryFg);
    r.style.setProperty("--sidebar-accent", p.sidebarAccent);
    r.style.setProperty("--sidebar-accent-foreground", p.sidebarAccentFg);
    r.style.setProperty("--sidebar-ring", p.accent);
    r.style.setProperty("--chart-1", p.primary);
    r.style.setProperty("--chart-2", p.accent);
  } catch { /* noop */ }
}
