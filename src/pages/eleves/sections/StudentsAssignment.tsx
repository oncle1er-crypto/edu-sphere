import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, Shuffle } from "lucide-react";

const classes = [
  { nom: "6ème A", capacite: 40, effectif: 38, prof: "M. Coulibaly" },
  { nom: "6ème B", capacite: 40, effectif: 35, prof: "Mme Diarra" },
  { nom: "5ème A", capacite: 40, effectif: 40, prof: "M. Touré" },
  { nom: "5ème B", capacite: 40, effectif: 33, prof: "Mme Sidibé" },
  { nom: "CM2", capacite: 35, effectif: 32, prof: "Mme Konaté" },
  { nom: "Tle S1", capacite: 30, effectif: 28, prof: "M. Sangaré" },
];

export default function StudentsAssignment() {
  return (
    <SettingsSection
      icon={<GraduationCap className="h-5 w-5" />}
      title="Affectation aux classes"
      description="Visualisez les effectifs et déplacez des élèves entre classes."
    >
      <div className="flex flex-col md:flex-row gap-3 md:items-end">
        <FieldRow label="Année scolaire">
          <Select defaultValue="2025-2026"><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2025-2026">2025 - 2026</SelectItem>
              <SelectItem value="2024-2025">2024 - 2025</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
        <Button variant="outline"><Shuffle className="h-4 w-4" />Affectation automatique</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {classes.map((c) => {
          const pct = Math.round((c.effectif / c.capacite) * 100);
          const full = pct >= 100;
          return (
            <Card key={c.nom} className="border">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold font-display">{c.nom}</h4>
                  <Badge variant={full ? "destructive" : "secondary"} className="text-[10px]">
                    {full ? "Pleine" : "Disponible"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Prof. principal : {c.prof}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{c.effectif} / {c.capacite}</span>
                  <span className="text-muted-foreground">{pct}%</span>
                </div>
                <Progress value={pct} className="h-2" />
                <Button variant="outline" size="sm" className="w-full mt-2">Gérer la classe</Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </SettingsSection>
  );
}
