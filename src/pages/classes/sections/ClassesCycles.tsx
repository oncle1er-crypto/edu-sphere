import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layers, Plus } from "lucide-react";

const cycles = [
  { nom: "Maternelle", couleur: "bg-pink-500", niveaux: ["Petite Section", "Moyenne Section", "Grande Section"], age: "3-5 ans", classes: 6 },
  { nom: "Primaire", couleur: "bg-blue-500", niveaux: ["CP", "CE1", "CE2", "CM1", "CM2"], age: "6-10 ans", classes: 12 },
  { nom: "Collège", couleur: "bg-emerald-500", niveaux: ["6ème", "5ème", "4ème", "3ème"], age: "11-14 ans", classes: 14 },
  { nom: "Lycée", couleur: "bg-amber-500", niveaux: ["2nde", "1ère (S, L, ES)", "Terminale (S, L, ES)"], age: "15-18 ans", classes: 10 },
  { nom: "Université", couleur: "bg-purple-500", niveaux: ["Licence 1", "Licence 2", "Licence 3", "Master 1", "Master 2"], age: "18+ ans", classes: 0 },
];

export default function ClassesCycles() {
  return (
    <SettingsSection
      icon={<Layers className="h-5 w-5" />}
      title="Cycles & niveaux"
      description="Structure pédagogique de l'établissement."
    >
      <div className="flex justify-end">
        <Button size="sm"><Plus className="h-4 w-4" />Nouveau cycle</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {cycles.map((c) => (
          <Card key={c.nom} className="border">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${c.couleur}`} />
                  <h4 className="font-bold font-display text-lg">{c.nom}</h4>
                </div>
                <Badge>{c.classes} classes</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Tranche d'âge : {c.age}</p>
              <div className="pt-2 border-t">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Niveaux</p>
                <div className="flex flex-wrap gap-1">
                  {c.niveaux.map((n) => <Badge key={n} variant="secondary" className="text-[10px]">{n}</Badge>)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
