import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

const matieres = [
  { nom: "Mathématiques", profs: ["Sidibé Amadou", "Maïga Salif"], coef: 4, niveaux: ["Collège", "Lycée"] },
  { nom: "Français", profs: ["Touré Fatoumata", "Diallo Hawa"], coef: 4, niveaux: ["Tous cycles"] },
  { nom: "Anglais (LV1)", profs: ["Sanogo Aïssata"], coef: 3, niveaux: ["Collège", "Lycée"] },
  { nom: "Physique-Chimie", profs: ["Diarra Mamadou"], coef: 4, niveaux: ["Lycée"] },
  { nom: "SVT", profs: ["Cissé Kadiatou", "Fofana Bintou"], coef: 3, niveaux: ["Collège", "Lycée"] },
  { nom: "Histoire-Géographie", profs: ["Kouyaté Boubacar"], coef: 3, niveaux: ["Collège", "Lycée"] },
  { nom: "EPS", profs: ["Camara Issa"], coef: 1, niveaux: ["Tous cycles"] },
  { nom: "Arts plastiques", profs: ["Bah Mariam"], coef: 1, niveaux: ["Primaire", "Collège"] },
];

export default function StaffSubjects() {
  return (
    <SettingsSection
      icon={<BookOpen className="h-5 w-5" />}
      title="Matières enseignées"
      description="Liste des matières et professeurs assignés."
      hideSave
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {matieres.map((m) => (
          <Card key={m.nom} className="border">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold font-display">{m.nom}</h4>
                <Badge variant="secondary">Coef. {m.coef}</Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {m.niveaux.map((n) => <Badge key={n} variant="outline" className="text-[10px]">{n}</Badge>)}
              </div>
              <div className="pt-2 border-t">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Enseignants</p>
                <ul className="space-y-0.5">
                  {m.profs.map((p) => (
                    <li key={p} className="text-sm">{p}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
