import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Plus } from "lucide-react";

const groupes = [
  { nom: "Option Latin", classes: ["4ème A", "4ème B", "3ème A"], effectif: 24, prof: "Mme Sangaré" },
  { nom: "Option Allemand (LV2)", classes: ["4ème", "3ème", "2nde", "1ère"], effectif: 36, prof: "M. Schmidt" },
  { nom: "Option Espagnol (LV2)", classes: ["4ème", "3ème", "2nde", "1ère"], effectif: 58, prof: "Mme Garcia" },
  { nom: "Atelier théâtre", classes: ["Tous niveaux"], effectif: 18, prof: "M. Coulibaly" },
  { nom: "Soutien Maths", classes: ["3ème", "2nde"], effectif: 22, prof: "M. Sidibé" },
  { nom: "Spécialité Mathématiques", classes: ["1ère S", "Tle S"], effectif: 42, prof: "M. Sangaré" },
];

export default function ClassesGroups() {
  return (
    <SettingsSection
      icon={<Users className="h-5 w-5" />}
      title="Groupes & options"
      description="Groupes transversaux : options, langues, soutien, spécialités."
    >
      <div className="flex justify-end">
        <Button size="sm"><Plus className="h-4 w-4" />Nouveau groupe</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {groupes.map((g) => (
          <Card key={g.nom} className="border">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold font-display">{g.nom}</h4>
                <Badge>{g.effectif} élèves</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Animé par : <span className="text-foreground font-medium">{g.prof}</span></p>
              <div className="flex flex-wrap gap-1 pt-2 border-t">
                {g.classes.map((c) => <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
