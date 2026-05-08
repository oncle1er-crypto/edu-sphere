import { Palette, Sun, Moon, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

type Prefs = { theme: "light" | "dark" | "auto"; densite: "compact" | "normal" | "aere" };
const DEFAULTS: Prefs = { theme: "light", densite: "normal" };

function applyTheme(theme: Prefs["theme"]) {
  const root = document.documentElement;
  const dark = theme === "dark" || (theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
}
function applyDensite(d: Prefs["densite"]) {
  const root = document.documentElement;
  root.dataset.density = d;
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
  }, [prefs]);

  const update = (patch: Partial<Prefs>) => setPrefs(p => ({ ...p, ...patch }));

  const handleSave = async () => {
    if (!user) return;
    const { data: current } = await supabase.from("profiles").select("preferences").eq("id", user.id).single();
    const merged = { ...(current?.preferences as object ?? {}), appearance: prefs };
    const { error } = await supabase.from("profiles").update({ preferences: merged }).eq("id", user.id);
    if (error) toast.error(error.message);
    else toast.success("Préférences d'apparence enregistrées");
  };

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Thème"
        description="Apparence de l'interface utilisateur."
        icon={<Palette className="h-5 w-5" />}
        onSave={handleSave}
      >
        <FieldRow label="Mode d'affichage">
          <RadioGroup value={prefs.theme} onValueChange={v => update({ theme: v as Prefs["theme"] })} className="grid grid-cols-3 gap-3 max-w-md">
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
        description="Les couleurs principales suivent la charte du Complexe Scolaire La Providence (Rouge Bordeaux & Jaune Poussin)."
        icon={<Palette className="h-5 w-5" />}
        hideSave
      >
        <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
          <div className="flex gap-2">
            <div className="h-12 w-12 rounded-md border" style={{ background: "hsl(345 65% 28%)" }} title="Primaire" />
            <div className="h-12 w-12 rounded-md border" style={{ background: "hsl(50 95% 60%)" }} title="Accent" />
          </div>
          <div className="text-sm">
            <div className="font-semibold text-primary">Rouge Bordeaux & Jaune Poussin</div>
            <div className="text-xs text-muted-foreground">Couleurs institutionnelles — modifiables par l'équipe Lovable uniquement.</div>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
