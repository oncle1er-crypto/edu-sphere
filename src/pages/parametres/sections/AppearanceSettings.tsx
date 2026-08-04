import { Palette, Sun, Moon, Monitor, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { messageErreurBase } from "@/lib/dbErrorMessages";

type PaletteKey =
  | "bordeaux-or"
  | "bleu-royal"
  | "vert-emeraude"
  | "violet-episcopal"
  | "noir-or"
  | "indigo-ciel";

type Prefs = {
  theme: "light" | "dark" | "auto";
  densite: "compact" | "normal" | "aere";
  palette: PaletteKey;
};
const DEFAULTS: Prefs = { theme: "light", densite: "normal", palette: "bordeaux-or" };

type PaletteDef = {
  key: PaletteKey;
  label: string;
  description: string;
  // HSL strings "h s% l%"
  primary: string;
  primaryFg: string;
  accent: string;
  accentFg: string;
  ring: string;
  secondary: string;
  secondaryFg: string;
  sidebarAccent: string;
  sidebarAccentFg: string;
  // for swatches (hex preview)
  swatch1: string;
  swatch2: string;
};

const PALETTES: Record<PaletteKey, PaletteDef> = {
  "bordeaux-or": {
    key: "bordeaux-or",
    label: "Rouge Bordeaux & Jaune Poussin",
    description: "Charte officielle GSP (par défaut).",
    primary: "345 65% 28%", primaryFg: "0 0% 100%",
    accent: "50 95% 60%", accentFg: "345 65% 28%",
    ring: "345 65% 28%",
    secondary: "45 60% 94%", secondaryFg: "345 65% 28%",
    sidebarAccent: "50 95% 90%", sidebarAccentFg: "345 65% 28%",
    swatch1: "#6E1A2C", swatch2: "#FCE34D",
  },
  "bleu-royal": {
    key: "bleu-royal",
    label: "Bleu Royal & Argent",
    description: "Sobre, institutionnel, inspiration marine.",
    primary: "220 70% 28%", primaryFg: "0 0% 100%",
    accent: "210 30% 80%", accentFg: "220 70% 18%",
    ring: "220 70% 28%",
    secondary: "215 40% 95%", secondaryFg: "220 70% 28%",
    sidebarAccent: "215 50% 92%", sidebarAccentFg: "220 70% 28%",
    swatch1: "#173A7A", swatch2: "#B8C5D6",
  },
  "vert-emeraude": {
    key: "vert-emeraude",
    label: "Vert Émeraude & Or",
    description: "Élégant, naturel, prestige.",
    primary: "158 65% 25%", primaryFg: "0 0% 100%",
    accent: "42 85% 55%", accentFg: "158 65% 18%",
    ring: "158 65% 25%",
    secondary: "150 30% 94%", secondaryFg: "158 65% 25%",
    sidebarAccent: "150 40% 90%", sidebarAccentFg: "158 65% 25%",
    swatch1: "#176B4D", swatch2: "#E6B532",
  },
  "violet-episcopal": {
    key: "violet-episcopal",
    label: "Violet Épiscopal & Crème",
    description: "Inspiration liturgique catholique.",
    primary: "275 45% 32%", primaryFg: "0 0% 100%",
    accent: "40 60% 82%", accentFg: "275 45% 22%",
    ring: "275 45% 32%",
    secondary: "280 25% 94%", secondaryFg: "275 45% 32%",
    sidebarAccent: "280 35% 92%", sidebarAccentFg: "275 45% 32%",
    swatch1: "#5E3A82", swatch2: "#EBD9B4",
  },
  "noir-or": {
    key: "noir-or",
    label: "Noir & Or",
    description: "Très haut de gamme, contraste fort.",
    primary: "0 0% 10%", primaryFg: "45 80% 70%",
    accent: "42 80% 52%", accentFg: "0 0% 10%",
    ring: "0 0% 10%",
    secondary: "0 0% 96%", secondaryFg: "0 0% 10%",
    sidebarAccent: "45 60% 90%", sidebarAccentFg: "0 0% 10%",
    swatch1: "#1A1A1A", swatch2: "#D7A82A",
  },
  "indigo-ciel": {
    key: "indigo-ciel",
    label: "Indigo & Ciel",
    description: "Moderne, lumineux, type SaaS.",
    primary: "238 65% 38%", primaryFg: "0 0% 100%",
    accent: "200 90% 65%", accentFg: "238 65% 18%",
    ring: "238 65% 38%",
    secondary: "220 40% 96%", secondaryFg: "238 65% 38%",
    sidebarAccent: "210 80% 92%", sidebarAccentFg: "238 65% 38%",
    swatch1: "#2E3FB2", swatch2: "#54B8F0",
  },
};

const PALETTE_STORAGE_KEY = "gsp.palette";

function applyTheme(theme: Prefs["theme"]) {
  const root = document.documentElement;
  const dark = theme === "dark" || (theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
}
function applyDensite(d: Prefs["densite"]) {
  document.documentElement.dataset.density = d;
}
function applyPalette(key: PaletteKey) {
  const p = PALETTES[key] ?? PALETTES["bordeaux-or"];
  const root = document.documentElement;
  root.style.setProperty("--primary", p.primary);
  root.style.setProperty("--primary-foreground", p.primaryFg);
  root.style.setProperty("--accent", p.accent);
  root.style.setProperty("--accent-foreground", p.accentFg);
  root.style.setProperty("--ring", p.ring);
  root.style.setProperty("--secondary", p.secondary);
  root.style.setProperty("--secondary-foreground", p.secondaryFg);
  root.style.setProperty("--sidebar-primary", p.primary);
  root.style.setProperty("--sidebar-primary-foreground", p.primaryFg);
  root.style.setProperty("--sidebar-accent", p.sidebarAccent);
  root.style.setProperty("--sidebar-accent-foreground", p.sidebarAccentFg);
  root.style.setProperty("--sidebar-ring", p.accent);
  root.style.setProperty("--chart-1", p.primary);
  root.style.setProperty("--chart-2", p.accent);
  try { localStorage.setItem(PALETTE_STORAGE_KEY, key); } catch { /* noop */ }
}

export default function AppearanceSettings() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase.from("profiles").select("preferences").eq("id", user.id).single()
      .then(({ data }) => {
        const p = (data?.preferences as { appearance?: Partial<Prefs> } | null)?.appearance;
        if (p) setPrefs({ ...DEFAULTS, ...p });
        setLoading(false);
      });
  }, [user]);

  useEffect(() => {
    applyTheme(prefs.theme);
    applyDensite(prefs.densite);
    applyPalette(prefs.palette);
  }, [prefs]);

  const update = (patch: Partial<Prefs>) => setPrefs(p => ({ ...p, ...patch }));

  const handleSave = async () => {
    if (!user) return;
    const { data: current } = await supabase.from("profiles").select("preferences").eq("id", user.id).single();
    const merged = { ...(current?.preferences as object ?? {}), appearance: prefs };
    const { error } = await supabase.from("profiles").update({ preferences: merged }).eq("id", user.id);
    if (error) toast.error(messageErreurBase(error));
    else toast.success("Préférences d'apparence enregistrées");
  };

  if (loading) return <Skeleton className="h-96 w-full" />;

  const activePalette = PALETTES[prefs.palette];

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Thème"
        description="Apparence de l'interface utilisateur."
        icon={<Palette className="h-5 w-5" />}
        onSave={handleSave}
      >
        <FieldRow label="Mode d'affichage">
          <RadioGroup value={prefs.theme} onValueChange={v => update({ theme: v as Prefs["theme"] })} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-md">
            {[
              { value: "light", label: "Clair", icon: Sun },
              { value: "dark", label: "Sombre", icon: Moon },
              { value: "auto", label: "Auto", icon: Monitor },
            ].map((m) => (
              <Label
                key={m.value}
                htmlFor={`theme-${m.value}`}
                className="flex flex-col items-center gap-2 border-2 rounded-xl p-4 cursor-pointer hover:border-accent/50 [&:has([data-state=checked])]:border-accent [&:has([data-state=checked])]:bg-accent/5"
              >
                <RadioGroupItem value={m.value} id={`theme-${m.value}`} className="sr-only" />
                <m.icon className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">{m.label}</span>
              </Label>
            ))}
          </RadioGroup>
        </FieldRow>

        <FieldRow label="Densité d'affichage">
          <Select value={prefs.densite} onValueChange={v => update({ densite: v as Prefs["densite"] })}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">Compact</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="aere">Aéré</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
      </SettingsSection>

      <SettingsSection
        title="Identité visuelle de l'établissement"
        description="Choisissez la palette de couleurs appliquée à toute l'interface. La charte officielle GSP reste l'option par défaut."
        icon={<Palette className="h-5 w-5" />}
        onSave={handleSave}
      >
        <FieldRow label="Palette de couleurs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
            {Object.values(PALETTES).map((p) => {
              const selected = prefs.palette === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => update({ palette: p.key })}
                  className={cn(
                    "relative text-left border-2 rounded-xl p-3 transition-all hover:shadow-md",
                    selected ? "border-accent bg-accent/5 ring-2 ring-accent/40" : "border-border hover:border-accent/50"
                  )}
                >
                  {selected && (
                    <span className="absolute top-2 right-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  <div className="flex gap-2 mb-2">
                    <div className="h-10 w-10 rounded-md border" style={{ background: p.swatch1 }} />
                    <div className="h-10 w-10 rounded-md border" style={{ background: p.swatch2 }} />
                  </div>
                  <div className="text-sm font-semibold leading-tight">{p.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{p.description}</div>
                </button>
              );
            })}
          </div>
        </FieldRow>

        <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
          <div className="flex gap-2">
            <div className="h-12 w-12 rounded-md border" style={{ background: activePalette.swatch1 }} title="Primaire" />
            <div className="h-12 w-12 rounded-md border" style={{ background: activePalette.swatch2 }} title="Accent" />
          </div>
          <div className="text-sm">
            <div className="font-semibold text-primary">{activePalette.label}</div>
            <div className="text-xs text-muted-foreground">{activePalette.description}</div>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
