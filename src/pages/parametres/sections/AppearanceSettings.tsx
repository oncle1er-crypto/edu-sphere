import { Palette, Sun, Moon, Monitor } from "lucide-react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

const presets = [
  { name: "Bleu & Or (par défaut)", primary: "#0F2A44", accent: "#D4AF37" },
  { name: "Bordeaux & Crème", primary: "#7B1E2B", accent: "#F5DEB3" },
  { name: "Vert Émeraude", primary: "#065F46", accent: "#FBBF24" },
  { name: "Violet Royal", primary: "#4C1D95", accent: "#FCD34D" },
  { name: "Marine & Argent", primary: "#1E3A8A", accent: "#94A3B8" },
];

export default function AppearanceSettings() {
  return (
    <div className="space-y-6">
      <SettingsSection
        title="Thème"
        description="Apparence de l'interface utilisateur."
        icon={<Palette className="h-5 w-5" />}
      >
        <FieldRow label="Mode d'affichage">
          <RadioGroup defaultValue="light" className="grid grid-cols-3 gap-3 max-w-md">
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
          <Select defaultValue="normal">
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">Compact</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="aere">Aéré</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Rayon des coins" hint="Plus arrondis = style moderne">
          <Slider defaultValue={[14]} min={0} max={24} step={2} className="max-w-md" />
        </FieldRow>
      </SettingsSection>

      <SettingsSection
        title="Palette de couleurs"
        description="Personnalisez les couleurs principales de votre plateforme."
        icon={<Palette className="h-5 w-5" />}
      >
        <FieldRow label="Préréglages">
          <div className="space-y-2">
            {presets.map((p) => (
              <button
                key={p.name}
                className="w-full flex items-center gap-3 p-3 border rounded-lg hover:border-accent/50 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex gap-1">
                  <div className="h-8 w-8 rounded-md border" style={{ background: p.primary }} />
                  <div className="h-8 w-8 rounded-md border" style={{ background: p.accent }} />
                </div>
                <span className="text-sm font-medium">{p.name}</span>
              </button>
            ))}
          </div>
        </FieldRow>

        <FieldRow label="Couleur primaire">
          <div className="flex gap-2 items-center">
            <Input type="color" defaultValue="#0F2A44" className="w-16 h-10 p-1 cursor-pointer" />
            <Input defaultValue="#0F2A44" className="w-32 font-mono" />
          </div>
        </FieldRow>

        <FieldRow label="Couleur d'accent">
          <div className="flex gap-2 items-center">
            <Input type="color" defaultValue="#D4AF37" className="w-16 h-10 p-1 cursor-pointer" />
            <Input defaultValue="#D4AF37" className="w-32 font-mono" />
          </div>
        </FieldRow>
      </SettingsSection>

      <SettingsSection
        title="Typographie"
        description="Police d'écriture utilisée dans l'interface."
        icon={<Palette className="h-5 w-5" />}
      >
        <FieldRow label="Police des titres">
          <Select defaultValue="jakarta">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="jakarta">Plus Jakarta Sans</SelectItem>
              <SelectItem value="inter">Inter</SelectItem>
              <SelectItem value="poppins">Poppins</SelectItem>
              <SelectItem value="montserrat">Montserrat</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
        <FieldRow label="Police du corps">
          <Select defaultValue="inter">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="inter">Inter</SelectItem>
              <SelectItem value="roboto">Roboto</SelectItem>
              <SelectItem value="opensans">Open Sans</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
      </SettingsSection>
    </div>
  );
}
