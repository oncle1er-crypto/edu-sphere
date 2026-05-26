import { useState } from "react";
import { SchoolCard, type CardData, type CardType } from "@/pages/cartes/components/SchoolCard";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette } from "lucide-react";

const TYPE_LABELS: Record<CardType, string> = {
  eleve: "Carte élève", personnel: "Badge personnel", cantine: "Carte cantine",
  transport: "Carte transport", bibliotheque: "Carte bibliothèque", visiteur: "Badge visiteur",
};

export default function CardsTemplates() {
  const [type, setType] = useState<CardType>("eleve");
  const [primary, setPrimary] = useState("#7B1F2B");
  const [accent, setAccent] = useState("#F5C518");
  const [logo, setLogo] = useState("");

  const sample: CardData = {
    type,
    ecoleId: "ec_001",
    ecoleNom: "Complexe Scolaire La Providence de Don Orione",
    ecoleVille: "Dakar",
    ecoleLogo: logo || undefined,
    nom: "DUPONT", prenom: "Marie", matricule: "EL-2451",
    classe: "3ème A", fonction: "Directrice",
    formule: "Demi-pensionnaire", ligne: "Ligne 3", arret: "Yoff",
    numLecteur: "LEC-128", motif: "Visite", hote: "M. Diop",
    anneeScolaire: "2025-2026", validJusqu: "2026-07-31",
    couleurPrimaire: primary, couleurAccent: accent,
  };

  return (
    <SettingsSection
      title="Designer de templates"
      description="Personnalisez l'apparence des cartes (couleurs, logo) — appliqué à toutes les futures émissions."
      icon={<Palette className="h-5 w-5" />}
      hideSave
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-start">
        <div className="space-y-3">
          <FieldRow label="Type de carte (aperçu)">
            <Select value={type} onValueChange={(v) => setType(v as CardType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_LABELS) as CardType[]).map((t) => (
                  <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Couleur primaire" hint="Bandeau supérieur et pied de carte">
            <div className="flex items-center gap-2">
              <Input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="h-10 w-16 p-1" />
              <Input value={primary} onChange={(e) => setPrimary(e.target.value)} className="font-mono" />
            </div>
          </FieldRow>
          <FieldRow label="Couleur d'accent" hint="Titre du type de carte">
            <div className="flex items-center gap-2">
              <Input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-10 w-16 p-1" />
              <Input value={accent} onChange={(e) => setAccent(e.target.value)} className="font-mono" />
            </div>
          </FieldRow>
          <FieldRow label="Logo (URL)" hint="Logo de l'école affiché en haut à gauche">
            <Input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://..." />
          </FieldRow>
        </div>

        <div className="flex flex-col gap-6 items-center bg-muted/30 rounded-xl p-6">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider">Recto</Label>
            <SchoolCard data={sample} side="recto" scale={1.3} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider">Verso</Label>
            <SchoolCard data={sample} side="verso" scale={1.3} />
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
