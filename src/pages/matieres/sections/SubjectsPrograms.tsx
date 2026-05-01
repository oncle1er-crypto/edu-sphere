import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GitBranch, FileText, Upload } from "lucide-react";
import { SUBJECTS } from "../data";

const PROGS = [
  { code: "MATH", classe: "6ème", chapitres: 12, faits: 8, periode: "T1" },
  { code: "FR", classe: "CM2", chapitres: 10, faits: 7, periode: "T1" },
  { code: "SVT", classe: "3ème", chapitres: 9, faits: 5, periode: "T2" },
  { code: "PC", classe: "Tle S1", chapitres: 14, faits: 9, periode: "T2" },
  { code: "REL", classe: "Toutes", chapitres: 8, faits: 6, periode: "Année" },
  { code: "PHILO", classe: "Tle", chapitres: 10, faits: 4, periode: "T1" },
];

export default function SubjectsPrograms() {
  return (
    <SettingsSection
      icon={<GitBranch className="h-5 w-5" />}
      title="Programmes & progressions"
      description="Référentiel pédagogique MENA et suivi de l'avancement par matière/classe."
      hideSave
    >
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm"><Upload className="h-4 w-4" />Importer un programme</Button>
        <Button size="sm"><FileText className="h-4 w-4" />Nouvelle progression</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PROGS.map((p) => {
          const sub = SUBJECTS.find((s) => s.code === p.code);
          const pct = Math.round((p.faits / p.chapitres) * 100);
          return (
            <Card key={`${p.code}-${p.classe}`} className="border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${sub?.couleur}`} />
                    <h3 className="font-semibold">{sub?.nom}</h3>
                  </div>
                  <Badge variant="outline">{p.periode}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Classe : {p.classe}</p>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>{p.faits} / {p.chapitres} chapitres</span>
                    <span className="font-semibold">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </SettingsSection>
  );
}
