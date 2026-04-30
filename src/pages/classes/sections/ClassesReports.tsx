import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileBarChart, Download } from "lucide-react";

const reports = [
  { titre: "Liste nominative par classe", desc: "Élèves de chaque classe avec coordonnées" },
  { titre: "Effectifs détaillés par cycle", desc: "Garçons / filles / total par niveau" },
  { titre: "Taux de remplissage", desc: "Capacité vs effectif réel par classe" },
  { titre: "Affectation des salles", desc: "Occupation hebdomadaire des salles" },
  { titre: "Liste des professeurs principaux", desc: "Avec classe et effectif géré" },
  { titre: "Répartition par option / LV2", desc: "Effectifs des groupes transversaux" },
];

export default function ClassesReports() {
  return (
    <SettingsSection
      icon={<FileBarChart className="h-5 w-5" />}
      title="Rapports"
      description="Exports PDF / Excel sur l'organisation pédagogique."
      hideSave
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {reports.map((r) => (
          <Card key={r.titre} className="border hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{r.titre}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
              </div>
              <Button variant="outline" size="sm"><Download className="h-4 w-4" />Télécharger</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
